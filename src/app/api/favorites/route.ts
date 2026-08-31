import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // "recipe" (food) | "cocktail" | null (all)

    // Fetch user's pantry items to calculate live readiness
    const pantryItems = await db.pantryItem.findMany({
      where: { userId: user.id },
      select: { name: true, normalizedName: true, category: true, isAlwaysAvailable: true },
    });

    const userNormalizedIngredients = new Set(
      pantryItems.map((p) => p.normalizedName.toLowerCase().trim())
    );
    const userRawIngredients = new Set(
      pantryItems.map((p) => p.name.toLowerCase().trim())
    );

    // Fetch favorites
    const favorites = await db.favorite.findMany({
      where: {
        userId: user.id,
        ...(type ? { type } : {}),
      },
      include: {
        recipe: {
          include: {
            cookbook: {
              select: { title: true, author: true, coverColor: true, coverImageUrl: true },
            },
            ingredients: true,
          },
        },
        restaurantDish: {
          include: {
            menu: { select: { restaurantName: true, city: true } },
            ingredients: true,
          },
        },
        restaurantCocktail: {
          include: {
            menu: { select: { restaurantName: true, city: true } },
            ingredients: true,
          },
        },
        customRecipe: {
          include: {
            ingredients: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Helper to calculate match score
    const calculateMatch = (ingredients: { name: string; normalizedName?: string; amount?: string | null; unit?: string | null; optional?: boolean }[]) => {
      if (!ingredients || ingredients.length === 0) {
        return { matchScore: 100, matchedIngredients: [], missingIngredients: [], ingredientsList: [] };
      }

      const matched: string[] = [];
      const missing: string[] = [];
      const detailedIngredients = ingredients.map((ing) => {
        const norm = (ing.normalizedName || normalizeIngredientName(ing.name)).toLowerCase().trim();
        const raw = ing.name.toLowerCase().trim();

        let isStocked =
          userNormalizedIngredients.has(norm) ||
          userRawIngredients.has(raw);

        if (!isStocked) {
          const userNormArray = Array.from(userNormalizedIngredients);
          for (let i = 0; i < userNormArray.length; i++) {
            const userNorm = userNormArray[i];
            if (userNorm.includes(norm) || norm.includes(userNorm)) {
              isStocked = true;
              break;
            }
          }
        }

        if (isStocked || ing.optional) {
          matched.push(ing.name);
        } else {
          missing.push(ing.name);
        }

        return {
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          optional: ing.optional || false,
          isStocked,
        };
      });

      const requiredIngredients = ingredients.filter((i) => !i.optional);
      const totalCount = requiredIngredients.length > 0 ? requiredIngredients.length : ingredients.length;
      const matchedRequired = detailedIngredients.filter((i) => i.isStocked && !i.optional).length;
      const matchScore = totalCount > 0 ? Math.round((matchedRequired / totalCount) * 100) : 100;

      return {
        matchScore,
        matchedIngredients: matched,
        missingIngredients: missing,
        ingredientsList: detailedIngredients,
      };
    };

    // Format results with enriched metadata and match scores
    const enrichedFavorites = favorites.map((fav) => {
      let rawMetadata: any = {};
      if (fav.metadataJson) {
        try {
          rawMetadata = JSON.parse(fav.metadataJson);
        } catch {
          rawMetadata = {};
        }
      }

      let title = fav.title;
      let sourceType = fav.sourceType || 'cookbook';
      let cookbookTitle: string | null | undefined = fav.cookbookTitle;
      let restaurantName: string | undefined;
      let pageNumber: number | null | undefined = fav.pageNumber;
      let servings: string | undefined;
      let prepTime: string | undefined;
      let cookTime: string | undefined;
      let instructions: string[] | string | undefined;
      let glassware: string | undefined;
      let ice: string | undefined;
      let technique: string | undefined;
      let spiritBase: string | undefined;
      let flavorProfile: string | undefined;
      let coverImageUrl: string | undefined;
      let coverColor: string | undefined;
      let ingredientsToMatch: any[] = [];

      if (fav.recipe) {
        title = fav.recipe.title;
        cookbookTitle = fav.recipe.cookbook.title;
        pageNumber = fav.recipe.pageNumber;
        servings = fav.recipe.servings || undefined;
        prepTime = fav.recipe.prepTime || undefined;
        cookTime = fav.recipe.cookTime || undefined;
        glassware = fav.recipe.glassware || undefined;
        ice = fav.recipe.ice || undefined;
        technique = fav.recipe.technique || undefined;
        coverImageUrl = fav.recipe.cookbook.coverImageUrl || undefined;
        coverColor = fav.recipe.cookbook.coverColor || undefined;
        ingredientsToMatch = fav.recipe.ingredients.map((i) => ({
          name: i.name,
          normalizedName: i.normalizedName,
          amount: i.amount,
          unit: i.unit,
          optional: i.optional,
        }));
      } else if (fav.restaurantDish) {
        title = fav.restaurantDish.name;
        sourceType = 'restaurant';
        restaurantName = fav.restaurantDish.menu.restaurantName;
        prepTime = fav.restaurantDish.prepTime || undefined;
        cookTime = fav.restaurantDish.cookTime || undefined;
        servings = fav.restaurantDish.servings || undefined;
        if (fav.restaurantDish.instructions) {
          try {
            instructions = JSON.parse(fav.restaurantDish.instructions);
          } catch {
            instructions = fav.restaurantDish.instructions;
          }
        }
        ingredientsToMatch = fav.restaurantDish.ingredients.map((i) => ({
          name: i.name,
          normalizedName: i.normalizedName,
          amount: i.amount,
          unit: i.unit,
          optional: i.optional,
        }));
      } else if (fav.restaurantCocktail) {
        title = fav.restaurantCocktail.name;
        sourceType = 'restaurant';
        restaurantName = fav.restaurantCocktail.menu.restaurantName;
        glassware = fav.restaurantCocktail.glassware || undefined;
        ice = fav.restaurantCocktail.ice || undefined;
        technique = fav.restaurantCocktail.technique || undefined;
        spiritBase = fav.restaurantCocktail.spiritBase || undefined;
        flavorProfile = fav.restaurantCocktail.flavorProfile || undefined;
        if (fav.restaurantCocktail.instructions) {
          try {
            instructions = JSON.parse(fav.restaurantCocktail.instructions);
          } catch {
            instructions = fav.restaurantCocktail.instructions;
          }
        }
        ingredientsToMatch = fav.restaurantCocktail.ingredients.map((i) => ({
          name: i.name,
          normalizedName: i.normalizedName,
          amount: i.amount,
          unit: i.unit,
          optional: i.optional,
        }));
      } else if (fav.customRecipe) {
        title = fav.customRecipe.title;
        sourceType = 'custom';
        cookbookTitle = fav.customRecipe.cookbookTitle || undefined;
        pageNumber = fav.customRecipe.pageNumber || undefined;
        prepTime = fav.customRecipe.prepTime || undefined;
        cookTime = fav.customRecipe.cookTime || undefined;
        servings = fav.customRecipe.servings || undefined;
        if (fav.customRecipe.instructions) {
          try {
            instructions = JSON.parse(fav.customRecipe.instructions);
          } catch {
            instructions = fav.customRecipe.instructions;
          }
        }
        ingredientsToMatch = fav.customRecipe.ingredients.map((i) => ({
          name: i.name,
          normalizedName: i.normalizedName,
          amount: i.amount,
          unit: i.unit,
          optional: i.optional,
        }));
      } else if (rawMetadata) {
        if (rawMetadata.ingredients) {
          ingredientsToMatch = rawMetadata.ingredients;
        }
        if (rawMetadata.instructions) instructions = rawMetadata.instructions;
        if (rawMetadata.glassware) glassware = rawMetadata.glassware;
        if (rawMetadata.ice) ice = rawMetadata.ice;
        if (rawMetadata.technique) technique = rawMetadata.technique;
        if (rawMetadata.spiritBase) spiritBase = rawMetadata.spiritBase;
        if (rawMetadata.flavorProfile) flavorProfile = rawMetadata.flavorProfile;
        if (rawMetadata.restaurantName) restaurantName = rawMetadata.restaurantName;
        if (rawMetadata.source) sourceType = rawMetadata.source;
      }

      const match = calculateMatch(ingredientsToMatch);

      return {
        id: fav.id,
        type: fav.type,
        title,
        sourceType,
        cookbookTitle,
        restaurantName,
        pageNumber,
        servings,
        prepTime,
        cookTime,
        glassware,
        ice,
        technique,
        spiritBase,
        flavorProfile,
        instructions,
        coverImageUrl,
        coverColor,
        recipeId: fav.recipeId,
        restaurantDishId: fav.restaurantDishId,
        restaurantCocktailId: fav.restaurantCocktailId,
        customRecipeId: fav.customRecipeId,
        createdAt: fav.createdAt,
        matchScore: match.matchScore,
        matchedIngredients: match.matchedIngredients,
        missingIngredients: match.missingIngredients,
        ingredients: match.ingredientsList,
      };
    });

    // Build unique identifier keys for fast UI lookup
    const favoriteKeys = new Set<string>();
    favorites.forEach((fav) => {
      favoriteKeys.add(fav.title.toLowerCase().trim());
      if (fav.recipeId) favoriteKeys.add(fav.recipeId);
      if (fav.restaurantDishId) favoriteKeys.add(fav.restaurantDishId);
      if (fav.restaurantCocktailId) favoriteKeys.add(fav.restaurantCocktailId);
      if (fav.customRecipeId) favoriteKeys.add(fav.customRecipeId);
    });

    return NextResponse.json({
      favorites: enrichedFavorites,
      favoriteKeys: Array.from(favoriteKeys),
      count: enrichedFavorites.length,
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      type, // "recipe" | "cocktail"
      title,
      sourceType,
      cookbookTitle,
      pageNumber,
      recipeId,
      restaurantDishId,
      restaurantCocktailId,
      customRecipeId,
      metadata,
      action, // optional: "add" | "remove"
    } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'type and title are required' }, { status: 400 });
    }

    // Check if favorite already exists
    const existing = await db.favorite.findFirst({
      where: {
        userId: user.id,
        type,
        OR: [
          { title: { equals: title.trim() } },
          ...(recipeId ? [{ recipeId }] : []),
          ...(restaurantDishId ? [{ restaurantDishId }] : []),
          ...(restaurantCocktailId ? [{ restaurantCocktailId }] : []),
          ...(customRecipeId ? [{ customRecipeId }] : []),
        ],
      },
    });

    if (action === 'remove' || (existing && action !== 'add')) {
      if (existing) {
        await db.favorite.delete({
          where: { id: existing.id },
        });
      }
      return NextResponse.json({
        favorited: false,
        message: `Removed "${title}" from favorites`,
      });
    }

    // Create new favorite
    const newFavorite = await db.favorite.create({
      data: {
        userId: user.id,
        type,
        title: title.trim(),
        sourceType: sourceType || 'cookbook',
        cookbookTitle: cookbookTitle || null,
        pageNumber: pageNumber ? Number(pageNumber) : null,
        recipeId: recipeId || null,
        restaurantDishId: restaurantDishId || null,
        restaurantCocktailId: restaurantCocktailId || null,
        customRecipeId: customRecipeId || null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({
      favorited: true,
      favorite: newFavorite,
      message: `Saved "${title}" to favorites!`,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.favorite.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 });
  }
}
