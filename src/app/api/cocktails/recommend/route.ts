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
  flavorProfiles?: string[];
  complexity?: string;
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
    const { spiritBase, flavorProfile, complexity, limit = 6, offset = 0 } = body;

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

    // 3. TIER 2: Curated Classic & Modern Web Specs strictly aligned with survey inputs
    const targetSpirit = (spiritBase && spiritBase !== 'Any') ? spiritBase.toLowerCase() : null;
    const targetFlavor = (flavorProfile && flavorProfile !== 'Any') ? flavorProfile.toLowerCase() : null;
    const targetComplexity = (complexity && complexity !== 'Any') ? complexity.toLowerCase() : null;

    const formatClassic = (classic: ClassicCocktailSpec): CocktailRecommendationResult => {
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

      return {
        id: `web-${classic.id}`,
        name: classic.name,
        source: 'web_classic' as const,
        spiritBase: classic.spiritBase,
        flavorProfile: targetFlavor || classic.flavorProfiles[0] || 'balanced',
        flavorProfiles: classic.flavorProfiles,
        complexity: classic.complexity,
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
      };
    };

    const matchesSpiritBase = (classic: ClassicCocktailSpec) => {
      if (!targetSpirit) return true;
      const base = classic.spiritBase.toLowerCase();
      if (base.includes(targetSpirit) || targetSpirit.includes(base)) return true;
      if (targetSpirit.includes('tequila') && base.includes('mezcal')) return true;
      if (targetSpirit.includes('whiskey') && (base.includes('bourbon') || base.includes('rye'))) return true;
      return false;
    };

    const matchesFlavor = (classic: ClassicCocktailSpec) => {
      if (!targetFlavor) return true;
      return classic.flavorProfiles.some((f) => f.toLowerCase() === targetFlavor);
    };

    const matchesComplexity = (classic: ClassicCocktailSpec) => {
      if (!targetComplexity) return true;
      return classic.complexity.toLowerCase() === targetComplexity;
    };

    // STRICT FLAVOR FILTERING:
    // If targetFlavor is requested, we MUST only return cocktails matching that flavor profile!
    const exactMatches: ClassicCocktailSpec[] = [];
    const flavorMatchesSameSpirit: ClassicCocktailSpec[] = [];
    const flavorMatchesOtherSpirits: ClassicCocktailSpec[] = [];

    const seenIds = new Set<string>();

    for (const classic of CLASSIC_COCKTAILS) {
      if (matchesFlavor(classic)) {
        if (matchesSpiritBase(classic)) {
          if (matchesComplexity(classic)) {
            exactMatches.push(classic);
            seenIds.add(classic.id);
          } else {
            flavorMatchesSameSpirit.push(classic);
            seenIds.add(classic.id);
          }
        } else {
          flavorMatchesOtherSpirits.push(classic);
          seenIds.add(classic.id);
        }
      }
    }

    const formatAndSort = (specs: ClassicCocktailSpec[]) => {
      return specs.map(formatClassic).sort((a, b) => b.matchScore - a.matchScore);
    };

    const sortedExact = formatAndSort(exactMatches);
    const sortedFlavorSameSpirit = formatAndSort(flavorMatchesSameSpirit);
    const sortedFlavorOtherSpirits = formatAndSort(flavorMatchesOtherSpirits);

    // Combine in strict order:
    // 1. Same spirit + target flavor + target complexity
    // 2. Same spirit + target flavor
    // 3. Other spirits with the EXACT target flavor (if the user clicks load more repeatedly)
    let combinedWebMatches: CocktailRecommendationResult[] = [
      ...sortedExact,
      ...sortedFlavorSameSpirit,
      ...sortedFlavorOtherSpirits,
    ];

    // Fallback only if no drinks in the entire database match the flavor (should not happen with our catalog)
    if (combinedWebMatches.length === 0) {
      combinedWebMatches = CLASSIC_COCKTAILS.filter(matchesSpiritBase).map(formatClassic);
    }

    // Deduplicate by ID
    const uniqueWebMatches: CocktailRecommendationResult[] = [];
    const uniqueIds = new Set<string>();
    for (const match of combinedWebMatches) {
      if (!uniqueIds.has(match.id)) {
        uniqueIds.add(match.id);
        uniqueWebMatches.push(match);
      }
    }

    // Paginate based on offset & limit (infinite continuous pool with unique IDs)
    const pool = uniqueWebMatches.length > 0 ? uniqueWebMatches : CLASSIC_COCKTAILS.map(formatClassic);
    const paginatedWebMatches: CocktailRecommendationResult[] = [];

    if (pool.length > 0) {
      for (let i = 0; i < limit; i++) {
        const globalIndex = offset + i;
        const poolIndex = globalIndex % pool.length;
        const cycle = Math.floor(globalIndex / pool.length);
        const item = pool[poolIndex];
        paginatedWebMatches.push({
          ...item,
          id: cycle === 0 ? item.id : `${item.id}-cycle-${cycle}-${i}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      libraryCount: libraryMatches.length,
      webCount: paginatedWebMatches.length,
      totalWebAvailable: uniqueWebMatches.length,
      hasMore: true, // Always keep reappearing indefinitely
      recommendations: {
        libraryMatches,
        webClassicMatches: paginatedWebMatches,
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
