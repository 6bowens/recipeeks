import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';
import { deduceAisleCategory, cleanRecipeText, parseIngredientLine } from '@/lib/playlist-utils';
import { parseQuantity } from '@/lib/recipe-scaling';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase().trim();
    const mealCategory = searchParams.get('category');
    const frequency = searchParams.get('frequency');
    const sourceFilter = searchParams.get('source'); // 'all', 'cookbook', 'custom'
    const tag = searchParams.get('tag')?.toLowerCase().trim();
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

    // 1. Fetch Custom Recipes
    const customRecipes = await db.customRecipe.findMany({
      where: {
        userId,
        ...(mealCategory && mealCategory !== 'all' ? { mealCategory } : {}),
        ...(frequency && frequency !== 'all' ? { frequency } : {}),
      },
      include: {
        ingredients: true,
        favorites: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch Physical Cookbook Recipes
    const cookbookRecipes = await db.recipe.findMany({
      where: {
        cookbook: { userId },
      },
      include: {
        cookbook: {
          select: { id: true, title: true, author: true, coverImageUrl: true, coverColor: true },
        },
        ingredients: true,
        favorites: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Clean and normalize Custom Recipes
    const cleanedCustom = customRecipes.map((r) => {
      const isFavorite = r.favorites && r.favorites.length > 0;
      const tagsList = r.tags
        ? r.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      return {
        ...r,
        title: cleanRecipeText(r.title),
        notes: r.notes ? cleanRecipeText(r.notes) : null,
        tagsList,
        isFavorite,
        ingredients: (r.ingredients || []).map((i) => {
          let name = cleanRecipeText(i.name);
          let amount = i.amount ? cleanRecipeText(i.amount) : null;
          let unit = i.unit ? cleanRecipeText(i.unit) : null;

          if (!amount && name) {
            const parsed = parseIngredientLine(name);
            if (parsed.amount) {
              amount = parsed.amount;
              unit = parsed.unit || null;
              name = parsed.name;
            }
          }

          return {
            ...i,
            name,
            amount,
            unit,
            aisleCategory: i.aisleCategory || deduceAisleCategory(name),
          };
        }),
      };
    });

    // Clean and format Cookbook Recipes into unified shape
    const cleanedCookbook = cookbookRecipes.map((r) => {
      const isFavorite = r.favorites && r.favorites.length > 0;
      const servingsStr = r.servings || '4';

      return {
        id: r.id,
        title: cleanRecipeText(r.title),
        sourceType: 'cookbook',
        cookbookId: r.cookbook.id,
        cookbookTitle: cleanRecipeText(r.cookbook.title),
        cookbookAuthor: r.cookbook.author ? cleanRecipeText(r.cookbook.author) : null,
        cookbookCoverUrl: r.cookbook.coverImageUrl,
        cookbookCoverColor: r.cookbook.coverColor,
        pageNumber: r.pageNumber,
        frequency: '1_week',
        servings: servingsStr,
        servingsNum: parseQuantity(servingsStr) || 4.0,
        prepTime: r.prepTime ? cleanRecipeText(r.prepTime) : null,
        cookTime: r.cookTime ? cleanRecipeText(r.cookTime) : null,
        tags: null,
        tagsList: [r.cookbook.title],
        cuisine: null,
        mealCategory: (r.category || 'dinner').toLowerCase(),
        rating: 5.0,
        imageUrl: r.cookbook.coverImageUrl,
        instructions: `Refer to ${r.cookbook.title}${r.pageNumber ? `, page ${r.pageNumber}` : ''} for the full preparation steps and culinary guide.`,
        notes: `From ${r.cookbook.title}${r.cookbook.author ? ` by ${r.cookbook.author}` : ''} (p. ${r.pageNumber || 'N/A'})`,
        userId,
        isFavorite,
        ingredients: (r.ingredients || []).map((i) => {
          let name = cleanRecipeText(i.name);
          let amount = i.amount ? cleanRecipeText(i.amount) : null;
          let unit = i.unit ? cleanRecipeText(i.unit) : null;

          if (!amount && name) {
            const parsed = parseIngredientLine(name);
            if (parsed.amount) {
              amount = parsed.amount;
              unit = parsed.unit || null;
              name = parsed.name;
            }
          }

          return {
            id: i.id,
            recipeId: r.id,
            name,
            normalizedName: i.normalizedName || normalizeIngredientName(name),
            amount,
            unit,
            aisleCategory: deduceAisleCategory(name),
            optional: !!i.optional,
          };
        }),
      };
    });

    // Merge both sources
    let allRecipes = [...cleanedCustom, ...cleanedCookbook];

    // Source filter
    if (sourceFilter === 'cookbook') {
      allRecipes = allRecipes.filter((r) => r.sourceType === 'cookbook');
    } else if (sourceFilter === 'custom') {
      allRecipes = allRecipes.filter((r) => r.sourceType !== 'cookbook');
    }

    // Category filter
    if (mealCategory && mealCategory !== 'all') {
      allRecipes = allRecipes.filter(
        (r) => (r.mealCategory || 'dinner').toLowerCase() === mealCategory.toLowerCase()
      );
    }

    // Frequency filter
    if (frequency && frequency !== 'all') {
      allRecipes = allRecipes.filter((r) => r.frequency === frequency);
    }

    // Search query
    if (q) {
      allRecipes = allRecipes.filter((r) => {
        const titleMatch = r.title.toLowerCase().includes(q);
        const notesMatch = r.notes?.toLowerCase().includes(q);
        const cuisineMatch = r.cuisine?.toLowerCase().includes(q);
        const bookMatch = r.cookbookTitle?.toLowerCase().includes(q);
        const tagMatch = r.tagsList.some((t: string) => t.toLowerCase().includes(q));
        const ingMatch = r.ingredients.some((i: any) => i.name.toLowerCase().includes(q));
        return titleMatch || notesMatch || cuisineMatch || bookMatch || tagMatch || ingMatch;
      });
    }

    // Tag filter
    if (tag) {
      allRecipes = allRecipes.filter((r) =>
        r.tagsList.some((t: string) => t.toLowerCase() === tag)
      );
    }

    // Favorites filter
    if (favoritesOnly) {
      allRecipes = allRecipes.filter((r) => r.isFavorite);
    }

    return NextResponse.json({
      success: true,
      recipes: allRecipes,
      customCount: cleanedCustom.length,
      cookbookCount: cleanedCookbook.length,
      count: allRecipes.length,
    });
  } catch (err) {
    console.error('Fetch recipes error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch recipes: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      sourceType = 'manual',
      sourceUrl,
      cookbookTitle,
      pageNumber,
      frequency = '1_week',
      servings = '4',
      servingsNum,
      prepTime,
      cookTime,
      tags,
      cuisine,
      mealCategory = 'dinner',
      rating = 5.0,
      imageUrl,
      instructions,
      notes,
      ingredients = [],
    } = body;

    const cleanedTitle = cleanRecipeText(title || '');
    if (!cleanedTitle) {
      return NextResponse.json({ error: 'Recipe title is required' }, { status: 400 });
    }

    const formattedInstructions =
      typeof instructions === 'string'
        ? cleanRecipeText(instructions)
        : Array.isArray(instructions)
        ? JSON.stringify(instructions.map((step: any) => cleanRecipeText(typeof step === 'string' ? step : '')))
        : null;

    const numericServings = servingsNum || parseQuantity(servings) || 4.0;

    const created = await db.customRecipe.create({
      data: {
        title: cleanedTitle,
        sourceType,
        sourceUrl,
        cookbookTitle: cookbookTitle ? cleanRecipeText(cookbookTitle) : null,
        pageNumber: pageNumber ? parseInt(String(pageNumber)) : null,
        frequency,
        servings: servings ? cleanRecipeText(String(servings)) : '4',
        servingsNum: numericServings,
        prepTime: prepTime ? cleanRecipeText(String(prepTime)) : null,
        cookTime: cookTime ? cleanRecipeText(String(cookTime)) : null,
        tags: tags ? (Array.isArray(tags) ? tags.join(', ') : cleanRecipeText(String(tags))) : null,
        cuisine: cuisine ? cleanRecipeText(String(cuisine)) : null,
        mealCategory: mealCategory ? cleanRecipeText(String(mealCategory)) : 'dinner',
        rating: rating !== undefined ? parseFloat(String(rating)) : 5.0,
        imageUrl: imageUrl || null,
        instructions: formattedInstructions,
        notes: notes ? cleanRecipeText(notes) : null,
        userId: session.user.id,
        ingredients: {
          create: ingredients
            .map((ing: any) => {
              const rawName = typeof ing === 'string' ? ing : ing.name || '';
              let cleanedName = cleanRecipeText(rawName);
              if (!cleanedName) return null;

              let amount = ing.amount ? cleanRecipeText(String(ing.amount)) : null;
              let unit = ing.unit ? cleanRecipeText(String(ing.unit)) : null;
              let aisleCategory = ing.aisleCategory || null;

              if (!amount) {
                const parsed = parseIngredientLine(rawName);
                if (parsed.amount) {
                  amount = parsed.amount;
                  unit = parsed.unit || null;
                  cleanedName = parsed.name;
                }
                if (!aisleCategory) {
                  aisleCategory = parsed.aisleCategory;
                }
              }

              if (!aisleCategory) {
                aisleCategory = deduceAisleCategory(cleanedName);
              }

              return {
                name: cleanedName,
                normalizedName: normalizeIngredientName(cleanedName),
                amount: amount || null,
                unit: unit || null,
                aisleCategory,
                optional: !!ing.optional,
              };
            })
            .filter((i: any) => i !== null),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json({
      success: true,
      recipe: created,
    });
  } catch (err) {
    console.error('Create recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to create recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const {
      id,
      frequency,
      title,
      servings,
      servingsNum,
      prepTime,
      cookTime,
      tags,
      cuisine,
      mealCategory,
      rating,
      imageUrl,
      notes,
      instructions,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const updated = await db.customRecipe.updateMany({
      where: { id, userId },
      data: {
        ...(frequency !== undefined ? { frequency } : {}),
        ...(title !== undefined ? { title: cleanRecipeText(title) } : {}),
        ...(servings !== undefined ? { servings: cleanRecipeText(servings) } : {}),
        ...(servingsNum !== undefined ? { servingsNum: parseFloat(String(servingsNum)) } : {}),
        ...(prepTime !== undefined ? { prepTime: cleanRecipeText(prepTime) } : {}),
        ...(cookTime !== undefined ? { cookTime: cleanRecipeText(cookTime) } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags.join(', ') : cleanRecipeText(tags) } : {}),
        ...(cuisine !== undefined ? { cuisine: cleanRecipeText(cuisine) } : {}),
        ...(mealCategory !== undefined ? { mealCategory: cleanRecipeText(mealCategory) } : {}),
        ...(rating !== undefined ? { rating: parseFloat(String(rating)) } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(notes !== undefined ? { notes: cleanRecipeText(notes) } : {}),
        ...(instructions !== undefined
          ? {
              instructions:
                typeof instructions === 'string'
                  ? cleanRecipeText(instructions)
                  : JSON.stringify(instructions),
            }
          : {}),
      },
    });

    if (Array.isArray(body.ingredients)) {
      await db.customRecipeIngredient.deleteMany({
        where: { recipeId: id },
      });

      const newIngredients = body.ingredients
        .map((ing: any) => {
          const rawName = typeof ing === 'string' ? ing : ing.name || '';
          let cleanedName = cleanRecipeText(rawName);
          if (!cleanedName) return null;

          let amount = ing.amount ? cleanRecipeText(String(ing.amount)) : null;
          let unit = ing.unit ? cleanRecipeText(String(ing.unit)) : null;
          let aisleCategory = ing.aisleCategory || null;

          if (!amount) {
            const parsed = parseIngredientLine(rawName);
            if (parsed.amount) {
              amount = parsed.amount;
              unit = parsed.unit || null;
              cleanedName = parsed.name;
            }
            if (!aisleCategory) {
              aisleCategory = parsed.aisleCategory;
            }
          }

          if (!aisleCategory) {
            aisleCategory = deduceAisleCategory(cleanedName);
          }

          return {
            recipeId: id,
            name: cleanedName,
            normalizedName: normalizeIngredientName(cleanedName),
            amount: amount || null,
            unit: unit || null,
            aisleCategory,
            optional: !!ing.optional,
          };
        })
        .filter(Boolean);

      if (newIngredients.length > 0) {
        await db.customRecipeIngredient.createMany({
          data: newIngredients,
        });
      }
    }

    const fullUpdatedRecipe = await db.customRecipe.findUnique({
      where: { id },
      include: {
        ingredients: true,
        favorites: { where: { userId } },
      },
    });

    return NextResponse.json({
      success: true,
      updated: updated.count,
      recipe: fullUpdatedRecipe,
    });
  } catch (err) {
    console.error('Update recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to update recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    await db.customRecipe.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to delete recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
