import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';
import { CLASSIC_COCKTAILS, ClassicCocktailSpec } from '@/lib/cocktail-utils';

export const dynamic = 'force-dynamic';

export interface CocktailRecommendationResult {
  id: string;
  name: string;
  source: 'library' | 'web_classic';
  bookTitle?: string;
  bookCover?: string | null;
  pageNumber?: number | null;
  spiritBase: string;
  flavorProfile: string;
  glassware: string;
  ice?: string;
  technique?: string;
  matchScore: number;
  ingredients: {
    name: string;
    amount?: string;
    unit?: string;
    isStocked: boolean;
  }[];
  matchedIngredients: string[];
  missingIngredients: string[];
  instructions: string[];
  garnish?: string;
  description?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { spiritBase, flavorProfile, complexity } = body;

    // 1. Fetch user's entire inventory (both pantry & bar items)
    const userInventory = await db.pantryItem.findMany({
      where: { userId },
    });

    const inventoryNormalized = userInventory.map((i) => ({
      ...i,
      norm: i.normalizedName || normalizeIngredientName(i.name),
    }));

    const isIngredientInInventory = (ingName: string) => {
      const targetNorm = normalizeIngredientName(ingName);
      return inventoryNormalized.some((item) => {
        if (item.norm === targetNorm) return true;
        if (item.name.toLowerCase() === ingName.toLowerCase()) return true;
        if (targetNorm.includes(item.norm) || item.norm.includes(targetNorm)) return true;
        // Token match
        const tokens = targetNorm.split(' ').filter((w) => w.length > 2);
        return tokens.some((tok) => item.norm.includes(tok));
      });
    };

    // 2. TIER 1: Search Physical Books in User's Library
    const cocktailBooks = await db.cookbook.findMany({
      where: {
        userId,
        OR: [
          { bookType: 'cocktail' },
          { bookType: 'both' },
          { recipes: { some: { category: { contains: 'Cocktail' } } } },
        ],
      },
      include: {
        recipes: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    const libraryMatches: CocktailRecommendationResult[] = [];

    for (const book of cocktailBooks) {
      for (const recipe of book.recipes) {
        if (!recipe.ingredients || recipe.ingredients.length === 0) continue;

        const matched: string[] = [];
        const missing: string[] = [];
        const ingredientsList = recipe.ingredients.map((ing) => {
          const stocked = isIngredientInInventory(ing.name) || ing.optional;
          if (stocked) {
            matched.push(ing.name);
          } else {
            missing.push(ing.name);
          }
          return {
            name: ing.name,
            amount: ing.amount || undefined,
            unit: ing.unit || undefined,
            isStocked: stocked,
          };
        });

        const score = Math.round((matched.length / recipe.ingredients.length) * 100);

        // Filter spirit match if user specified a base
        let matchesSpirit = true;
        if (spiritBase && spiritBase !== 'Any') {
          const spiritNorm = spiritBase.toLowerCase();
          matchesSpirit = recipe.ingredients.some((i) =>
            i.name.toLowerCase().includes(spiritNorm)
          ) || recipe.title.toLowerCase().includes(spiritNorm);
        }

        if (matchesSpirit) {
          libraryMatches.push({
            id: `lib-${recipe.id}`,
            name: recipe.title,
            source: 'library',
            bookTitle: book.title,
            bookCover: book.coverImageUrl,
            pageNumber: recipe.pageNumber,
            spiritBase: spiritBase || 'Mixed Spirits',
            flavorProfile: flavorProfile || 'Balanced',
            glassware: recipe.glassware || 'Coupe or Rocks Glass',
            ice: recipe.ice || 'Served Up or on Rocks',
            technique: recipe.technique || 'Shaken or Stirred',
            matchScore: score,
            ingredients: ingredientsList,
            matchedIngredients: matched,
            missingIngredients: missing,
            instructions: [
              `Reference page ${recipe.pageNumber || 'index'} in ${book.title} for exact spec and preparation technique.`,
            ],
            description: `From your cocktail book "${book.title}"`,
          });
        }
      }
    }

    // Sort Tier 1 matches by highest match score
    libraryMatches.sort((a, b) => b.matchScore - a.matchScore);

    // 3. TIER 2: Curated Classic & Modern Web Speakeasy Database
    const webClassicMatches: CocktailRecommendationResult[] = [];

    for (const classic of CLASSIC_COCKTAILS) {
      // Filter by spirit if specified
      if (spiritBase && spiritBase !== 'Any') {
        const target = spiritBase.toLowerCase();
        if (!classic.spiritBase.toLowerCase().includes(target) && !classic.name.toLowerCase().includes(target)) {
          continue;
        }
      }

      // Filter by flavor profile if specified
      if (flavorProfile && flavorProfile !== 'Any') {
        if (classic.flavorProfile !== flavorProfile.toLowerCase()) {
          continue;
        }
      }

      const matched: string[] = [];
      const missing: string[] = [];

      const ingredientsList = classic.ingredients.map((ing) => {
        const stocked = isIngredientInInventory(ing.name) || ing.optional;
        if (stocked) {
          matched.push(ing.name);
        } else {
          missing.push(ing.name);
        }
        return {
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          isStocked: !!stocked,
        };
      });

      const score = Math.round((matched.length / classic.ingredients.length) * 100);

      webClassicMatches.push({
        id: `web-${classic.id}`,
        name: classic.name,
        source: 'web_classic',
        spiritBase: classic.spiritBase,
        flavorProfile: classic.flavorProfile,
        glassware: classic.glassware,
        ice: classic.ice,
        technique: classic.technique,
        matchScore: score,
        ingredients: ingredientsList,
        matchedIngredients: matched,
        missingIngredients: missing,
        instructions: classic.instructions,
        garnish: classic.garnish,
        description: classic.description,
      });
    }

    webClassicMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Combine Tier 1 & Tier 2: Library matches first!
    return NextResponse.json({
      success: true,
      libraryCount: libraryMatches.length,
      webCount: webClassicMatches.length,
      recommendations: {
        libraryMatches,
        webClassicMatches,
      },
    });
  } catch (error) {
    console.error('Cocktail recommend error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cocktail recommendations: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
