import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName, isDessertRecipe } from '@/lib/utils';
import { matchesCutConstraint, identifyCut, CUT_CATEGORIES } from '@/lib/cut-utils';
import { MatchedRecipeResult } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cookbookIdFilter = searchParams.get('cookbookId');
    const minMatchScore = parseInt(searchParams.get('minScore') || '0', 10);
    const mustUseFilter = searchParams.get('mustUse')?.trim() || null;

    // 1. Fetch user's pantry items & staples
    const pantryItems = await db.pantryItem.findMany({
      where: { userId: session.user.id },
    });

    const pantryItemMap = new Map<string, typeof pantryItems[0]>();
    const preparedPantryList = pantryItems.map((p) => {
      const norm = p.normalizedName || normalizeIngredientName(p.name);
      pantryItemMap.set(norm, p);
      return { item: p, norm };
    });

    // Helper to check if a recipe ingredient is in pantry and return the matching PantryItem
    const findMatchingPantryItem = (ingName: string, ingNorm: string) => {
      // 1. Exact normalized match
      const exact = pantryItemMap.get(ingNorm);
      if (exact) return exact;

      // 2. Exact match on raw name
      const exactName = pantryItems.find((p) => p.name.toLowerCase() === ingName.toLowerCase());
      if (exactName) return exactName;

      // 3. Substring / contains match
      for (const { item, norm } of preparedPantryList) {
        if (ingNorm.includes(norm) || norm.includes(ingNorm)) {
          return item;
        }
      }

      // 4. Token match (e.g. "yukon gold potatoes" vs "potatoes")
      const ingWords = ingNorm.split(' ').filter((w) => w.length > 2);
      for (const { item, norm } of preparedPantryList) {
        const pWords = norm.split(' ').filter((w) => w.length > 2);
        if (ingWords.some((w) => pWords.includes(w))) {
          return item;
        }
      }

      return null;
    };

    // 2. Fetch cookbooks and recipes
    const cookbooks = await db.cookbook.findMany({
      where: {
        userId: session.user.id,
        ...(cookbookIdFilter ? { id: cookbookIdFilter } : {}),
      },
      include: {
        recipes: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    const results: MatchedRecipeResult[] = [];
    const cutCountMap = new Map<string, number>();

    for (const book of cookbooks) {
      for (const recipe of book.recipes) {
        const ingredients = recipe.ingredients;
        const totalCount = ingredients.length;

        if (totalCount === 0) continue;

        const matched: string[] = [];
        const missing: string[] = [];
        const matchedPantryMap: Record<string, string> = {};
        let starIngredientMatch: string | undefined = undefined;

        // Track cuts found in this recipe for stats
        const cutsInRecipe = new Set<string>();

        for (const ing of ingredients) {
          const norm = ing.normalizedName || normalizeIngredientName(ing.name);
          const matchedPantryItem = findMatchingPantryItem(ing.name, norm);

          if (matchedPantryItem) {
            matched.push(ing.name);
            matchedPantryMap[ing.name] = matchedPantryItem.id;
          } else if (ing.optional) {
            matched.push(ing.name);
          } else {
            missing.push(ing.name);
          }

          // Check if this ingredient matches the mustUse target
          if (mustUseFilter && !starIngredientMatch) {
            if (matchesCutConstraint(ing.name, mustUseFilter) || matchesCutConstraint(recipe.title, mustUseFilter)) {
              starIngredientMatch = ing.name;
            }
          }

          // Track cut identification for autocomplete counts
          const identified = identifyCut(ing.name);
          if (identified) {
            cutsInRecipe.add(identified.cutId);
          }
        }

        cutsInRecipe.forEach((cutId) => {
          cutCountMap.set(cutId, (cutCountMap.get(cutId) || 0) + 1);
        });

        // If a must-use constraint was requested and this recipe doesn't contain it, skip!
        if (mustUseFilter && !starIngredientMatch) {
          // Check recipe title as fallback
          if (matchesCutConstraint(recipe.title, mustUseFilter)) {
            starIngredientMatch = mustUseFilter;
          } else {
            continue;
          }
        }

        const isDessert = isDessertRecipe({ title: recipe.title, category: recipe.category }, book.title);
        const matchScore = Math.round((matched.length / totalCount) * 100);

        if (matchScore >= minMatchScore) {
          results.push({
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            pageNumber: recipe.pageNumber,
            isFact: recipe.isFact,
            cookbookId: book.id,
            cookbookTitle: book.title,
            cookbookAuthor: book.author,
            coverColor: book.coverColor,
            matchScore,
            totalIngredientsCount: totalCount,
            matchedIngredientsCount: matched.length,
            missingIngredients: missing,
            matchedIngredients: matched,
            matchedPantryMap,
            isDessert,
            starIngredientMatch,
          });
        }
      }
    }

    // Sort by match score descending, then by verified status, then by title
    results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      if (b.isFact !== a.isFact) {
        return b.isFact ? 1 : -1;
      }
      return a.recipeTitle.localeCompare(b.recipeTitle);
    });

    // 3. Extract user's stocked fridge/freezer cuts & key staples as 1-click quick chips
    const inventoryCuts: { id: string; label: string; icon: string; recipeCount: number; originalName: string }[] = [];
    const seenCutIds = new Set<string>();

    for (const pItem of pantryItems) {
      const cut = identifyCut(pItem.name);
      if (cut && !seenCutIds.has(cut.cutId)) {
        seenCutIds.add(cut.cutId);
        const recipeCount = cutCountMap.get(cut.cutId) || 0;
        if (recipeCount > 0) {
          inventoryCuts.push({
            id: cut.cutId,
            label: cut.label,
            icon: cut.icon,
            recipeCount,
            originalName: pItem.name,
          });
        }
      }
    }

    // Sort inventory cuts by recipe count descending
    inventoryCuts.sort((a, b) => b.recipeCount - a.recipeCount);

    return NextResponse.json({
      success: true,
      totalMatches: results.length,
      perfectMatches: results.filter((r) => r.matchScore === 100).length,
      mustUse: mustUseFilter,
      inventoryCuts,
      results,
    });
  } catch (error) {
    console.error('Match recipes error:', error);
    return NextResponse.json(
      { error: 'Failed to match recipes: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
