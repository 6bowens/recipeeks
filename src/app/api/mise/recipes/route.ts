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
    const tag = searchParams.get('tag')?.toLowerCase().trim();
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

    const recipes = await db.customRecipe.findMany({
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

    let cleanedRecipes = recipes.map((r) => {
      const isFavorite = (r.favorites && r.favorites.length > 0);
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
          };
        }),
      };
    });

    // In-memory filter for search query and tag
    if (q) {
      cleanedRecipes = cleanedRecipes.filter((r) => {
        const titleMatch = r.title.toLowerCase().includes(q);
        const notesMatch = r.notes?.toLowerCase().includes(q);
        const cuisineMatch = r.cuisine?.toLowerCase().includes(q);
        const tagMatch = r.tagsList.some((t: string) => t.toLowerCase().includes(q));
        const ingMatch = r.ingredients.some((i: any) => i.name.toLowerCase().includes(q));
        return titleMatch || notesMatch || cuisineMatch || tagMatch || ingMatch;
      });
    }

    if (tag) {
      cleanedRecipes = cleanedRecipes.filter((r) =>
        r.tagsList.some((t: string) => t.toLowerCase() === tag)
      );
    }

    if (favoritesOnly) {
      cleanedRecipes = cleanedRecipes.filter((r) => r.isFavorite);
    }

    return NextResponse.json({
      success: true,
      recipes: cleanedRecipes,
      count: cleanedRecipes.length,
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

    if (frequency === 'paused') {
      const activePlaylist = await db.mealPlaylist.findFirst({
        where: { userId, active: true },
      });

      if (activePlaylist?.scheduleJson) {
        try {
          const slots: { day: number; recipeId: string; locked?: boolean }[] = JSON.parse(
            activePlaylist.scheduleJson
          );
          const needsSwap = slots.some((s) => s.recipeId === id);
          if (needsSwap) {
            const allRecipes = await db.customRecipe.findMany({
              where: { userId },
            });
            const activePool = allRecipes.filter((r) => r.id !== id && r.frequency !== 'paused');
            const currentIds = new Set(slots.map((s) => s.recipeId));

            const updatedSlots = slots.map((s) => {
              if (s.recipeId === id) {
                let pool = activePool.filter((cand) => !currentIds.has(cand.id));
                if (pool.length === 0) pool = activePool;
                if (pool.length > 0) {
                  const replacement = pool[Math.floor(Math.random() * pool.length)];
                  currentIds.add(replacement.id);
                  return { ...s, recipeId: replacement.id, locked: false };
                }
              }
              return s;
            });

            await db.mealPlaylist.update({
              where: { id: activePlaylist.id },
              data: { scheduleJson: JSON.stringify(updatedSlots) },
            });
          }
        } catch (e) {}
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
