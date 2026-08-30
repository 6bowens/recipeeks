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
  source: 'library' | 'web_classic' | 'restaurant_menu';
  bookTitle?: string;
  bookCover?: string | null;
  pageNumber?: number | null;
  restaurantName?: string;
  restaurantCity?: string | null;
  menuDescription?: string | null;
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
    const { spiritBase, flavorProfile, complexity, searchQuery, query, limit = 6, offset = 0 } = body;
    const searchTerm = (searchQuery || query || '').trim().toLowerCase();

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

    // =========================================================================
    // 1) FIRST PRIORITY: Physical Recipe Books in User's Library
    // =========================================================================
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

        // If search term is provided, filter by recipe title, book title, or ingredients
        if (searchTerm) {
          const titleMatch = recipe.title.toLowerCase().includes(searchTerm);
          const bookMatch = book.title.toLowerCase().includes(searchTerm);
          const ingMatch = recipe.ingredients.some((i) => i.name.toLowerCase().includes(searchTerm));
          if (!titleMatch && !bookMatch && !ingMatch) {
            continue;
          }
        }

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
          matchesSpirit =
            recipe.ingredients.some((i) => i.name.toLowerCase().includes(spiritNorm)) ||
            recipe.title.toLowerCase().includes(spiritNorm);
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

    // Sort Tier 1 (Recipe Books): Exact name matches first, then highest inventory score
    libraryMatches.sort((a, b) => {
      if (searchTerm) {
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }
      return b.matchScore - a.matchScore;
    });

    // =========================================================================
    // 2) SECOND PRIORITY: Global Restaurant & Speakeasy Cocktails
    // =========================================================================
    const globalRestaurantCocktails = await db.restaurantCocktail.findMany({
      include: {
        menu: true,
        ingredients: true,
      },
    });

    const restaurantMatches: CocktailRecommendationResult[] = [];
    for (const rc of globalRestaurantCocktails) {
      if (!rc.ingredients || rc.ingredients.length === 0) continue;

      // If search term is provided, filter by cocktail name, restaurant name, city, notes, or ingredients
      if (searchTerm) {
        const nameMatch = rc.name.toLowerCase().includes(searchTerm);
        const restMatch = rc.menu.restaurantName.toLowerCase().includes(searchTerm);
        const cityMatch = rc.menu.city ? rc.menu.city.toLowerCase().includes(searchTerm) : false;
        const descMatch = rc.menuDescription ? rc.menuDescription.toLowerCase().includes(searchTerm) : false;
        const ingMatch = rc.ingredients.some((i) => i.name.toLowerCase().includes(searchTerm));
        if (!nameMatch && !restMatch && !cityMatch && !descMatch && !ingMatch) {
          continue;
        }
      }

      const matched: string[] = [];
      const missing: string[] = [];
      const ingredientsList = rc.ingredients.map((ing) => {
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

      const score = Math.round((matched.length / rc.ingredients.length) * 100);

      let matchesSpirit = true;
      if (spiritBase && spiritBase !== 'Any') {
        const spiritNorm = spiritBase.toLowerCase();
        matchesSpirit =
          (rc.spiritBase ? rc.spiritBase.toLowerCase().includes(spiritNorm) : false) ||
          rc.ingredients.some((i) => i.name.toLowerCase().includes(spiritNorm)) ||
          rc.name.toLowerCase().includes(spiritNorm);
      }

      let instructionsArray: string[] = [];
      try {
        if (rc.instructions) {
          instructionsArray = JSON.parse(rc.instructions);
        }
      } catch (e) {
        instructionsArray = rc.instructions ? [rc.instructions] : [];
      }

      if (matchesSpirit) {
        restaurantMatches.push({
          id: `rest-${rc.id}`,
          name: rc.name,
          source: 'restaurant_menu',
          restaurantName: rc.menu.restaurantName,
          restaurantCity: rc.menu.city,
          menuDescription: rc.menuDescription,
          spiritBase: rc.spiritBase || 'Craft Mix',
          flavorProfile: rc.flavorProfile || 'Balanced',
          glassware: rc.glassware || 'Coupe',
          ice: rc.ice || 'Served Up',
          technique: rc.technique || 'Shaken',
          garnish: rc.garnish || undefined,
          matchScore: score,
          ingredients: ingredientsList,
          matchedIngredients: matched,
          missingIngredients: missing,
          instructions: instructionsArray,
          description: `From ${rc.menu.restaurantName} cocktail menu${rc.menu.city ? ` (${rc.menu.city})` : ''}`,
        });
      }
    }

    // Sort Tier 2 (Restaurant Cocktails): Exact name matches first, then highest inventory score
    restaurantMatches.sort((a, b) => {
      if (searchTerm) {
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }
      return b.matchScore - a.matchScore;
    });

    // =========================================================================
    // 3) THIRD PRIORITY: Curated Web & Classic Recipes
    // =========================================================================
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

    const matchesSearch = (classic: ClassicCocktailSpec) => {
      if (!searchTerm) return true;
      return (
        classic.name.toLowerCase().includes(searchTerm) ||
        (classic.description ? classic.description.toLowerCase().includes(searchTerm) : false) ||
        classic.spiritBase.toLowerCase().includes(searchTerm) ||
        classic.flavorProfiles.some((f) => f.toLowerCase().includes(searchTerm)) ||
        classic.ingredients.some((i) => i.name.toLowerCase().includes(searchTerm))
      );
    };

    // If search term is specified, search across all classic web recipes
    let combinedWebMatches: CocktailRecommendationResult[] = [];

    if (searchTerm) {
      const filtered = CLASSIC_COCKTAILS.filter(matchesSearch).filter(matchesSpiritBase);
      const formatted = filtered.map(formatClassic);
      formatted.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return b.matchScore - a.matchScore;
      });
      combinedWebMatches = formatted;
    } else {
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

      combinedWebMatches = [
        ...sortedExact,
        ...sortedFlavorSameSpirit,
        ...sortedFlavorOtherSpirits,
      ];

      // Fallback only if no drinks in the entire database match the flavor
      if (combinedWebMatches.length === 0) {
        combinedWebMatches = CLASSIC_COCKTAILS.filter(matchesSpiritBase).map(formatClassic);
      }
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
      restaurantCount: restaurantMatches.length,
      webCount: paginatedWebMatches.length,
      totalWebAvailable: uniqueWebMatches.length,
      hasMore: true, // Always keep reappearing indefinitely
      recommendations: {
        libraryMatches,
        restaurantMatches,
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
