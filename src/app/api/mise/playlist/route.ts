import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generatePlaylistRotation, computeGroceryDelta, cleanRecipeText, deduceAisleCategory } from '@/lib/playlist-utils';
import { normalizeIngredientName } from '@/lib/utils';
import { parseQuantity } from '@/lib/recipe-scaling';

export const dynamic = 'force-dynamic';

async function getAllUserRecipes(userId: string) {
  const custom = await db.customRecipe.findMany({
    where: { userId },
    include: { ingredients: true },
  });

  const cookbookRecipes = await db.recipe.findMany({
    where: { cookbook: { userId } },
    include: {
      cookbook: { select: { id: true, title: true, author: true, coverImageUrl: true } },
      ingredients: true,
    },
  });

  const formattedCookbook = cookbookRecipes.map((r) => ({
    id: r.id,
    title: cleanRecipeText(r.title),
    sourceType: 'cookbook',
    cookbookId: r.cookbook.id,
    cookbookTitle: cleanRecipeText(r.cookbook.title),
    cookbookAuthor: r.cookbook.author ? cleanRecipeText(r.cookbook.author) : null,
    cookbookCoverUrl: r.cookbook.coverImageUrl,
    pageNumber: r.pageNumber,
    frequency: '1_week',
    servings: r.servings || '4',
    servingsNum: parseQuantity(r.servings) || 4.0,
    prepTime: r.prepTime ? cleanRecipeText(r.prepTime) : null,
    cookTime: r.cookTime ? cleanRecipeText(r.cookTime) : null,
    mealCategory: (r.category || 'dinner').toLowerCase(),
    instructions: `Refer to ${r.cookbook.title}${r.pageNumber ? `, page ${r.pageNumber}` : ''}.`,
    notes: `From ${r.cookbook.title} (p. ${r.pageNumber || 'N/A'})`,
    ingredients: (r.ingredients || []).map((i) => ({
      id: i.id,
      name: cleanRecipeText(i.name),
      normalizedName: i.normalizedName || normalizeIngredientName(i.name),
      amount: i.amount ? cleanRecipeText(i.amount) : null,
      unit: i.unit ? cleanRecipeText(i.unit) : null,
      aisleCategory: deduceAisleCategory(i.name),
      optional: !!i.optional,
    })),
  }));

  return [...custom, ...formattedCookbook];
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch unified user recipes (Custom + Cookbooks)
    const userRecipes = await getAllUserRecipes(userId);
    const activeRecipes = userRecipes.filter((r) => r.frequency !== 'paused');

    // Fetch pantry items
    const pantryItems = await db.pantryItem.findMany({
      where: { userId },
    });

    // Fetch active playlist
    let playlistRecord = await db.mealPlaylist.findFirst({
      where: { userId, active: true },
      orderBy: { updatedAt: 'desc' },
    });

    let scheduledSlots: { day: number; recipeId: string; locked?: boolean }[] = [];
    let daysCount = playlistRecord?.daysCount || 3;

    if (playlistRecord?.scheduleJson) {
      try {
        scheduledSlots = JSON.parse(playlistRecord.scheduleJson);
      } catch (e) {
        scheduledSlots = [];
      }
    }

    // If no playlist or slots are empty and user has recipes, auto-generate initial playlist
    if ((!playlistRecord || scheduledSlots.length === 0) && activeRecipes.length > 0) {
      const generated = generatePlaylistRotation(userRecipes, daysCount);
      scheduledSlots = generated.map((g) => ({
        day: g.day,
        recipeId: g.recipe.id,
        locked: false,
      }));

      if (playlistRecord) {
        playlistRecord = await db.mealPlaylist.update({
          where: { id: playlistRecord.id },
          data: {
            daysCount,
            scheduleJson: JSON.stringify(scheduledSlots),
          },
        });
      } else {
        playlistRecord = await db.mealPlaylist.create({
          data: {
            name: 'The Platelist',
            daysCount,
            scheduleJson: JSON.stringify(scheduledSlots),
            active: true,
            userId,
          },
        });
      }
    }

    // Check if any slot currently contains a paused or missing recipe
    let slotsChanged = false;
    const currentActiveIds = new Set(scheduledSlots.map((s) => s.recipeId));

    scheduledSlots = scheduledSlots.map((slot) => {
      const r = userRecipes.find((item) => item.id === slot.recipeId);
      if (!r || r.frequency === 'paused') {
        slotsChanged = true;
        let pool = activeRecipes.filter((cand) => !currentActiveIds.has(cand.id));
        if (pool.length === 0) pool = activeRecipes;
        if (pool.length > 0) {
          const replacement = pool[Math.floor(Math.random() * pool.length)];
          currentActiveIds.add(replacement.id);
          return {
            ...slot,
            recipeId: replacement.id,
            locked: false,
          };
        }
      }
      return slot;
    });

    if (slotsChanged && playlistRecord) {
      await db.mealPlaylist.update({
        where: { id: playlistRecord.id },
        data: {
          scheduleJson: JSON.stringify(scheduledSlots),
        },
      });
    }

    // Hydrate slots with active recipe details
    const hydratedSlots = scheduledSlots
      .map((slot) => {
        const r = userRecipes.find((item) => item.id === slot.recipeId);
        if (!r || r.frequency === 'paused') return null;
        return {
          day: slot.day,
          locked: !!slot.locked,
          recipe: r,
        };
      })
      .filter((slot): slot is { day: number; locked: boolean; recipe: any } => slot !== null);

    // Compute Grocery Delta for the active playlist
    const activePlaylistRecipes = hydratedSlots.map((s) => s.recipe);
    const groceryDelta = computeGroceryDelta(activePlaylistRecipes, pantryItems);

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlistRecord?.id || 'temp',
        daysCount,
        slots: hydratedSlots,
      },
      availableRecipesCount: activeRecipes.length,
      groceryDelta,
    });
  } catch (err) {
    console.error('Fetch playlist error:', err);
    return NextResponse.json(
      { error: 'Failed to load playlist: ' + (err as Error).message },
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

    const userId = session.user.id;
    const body = await req.json();
    const { daysCount = 3, pinnedSlots = [] } = body;

    const userRecipes = await getAllUserRecipes(userId);
    const activeRecipes = userRecipes.filter((r) => r.frequency !== 'paused');

    if (activeRecipes.length === 0) {
      return NextResponse.json(
        { error: 'Please unpause or add recipes to your Mise vault first before generating The Platelist.' },
        { status: 400 }
      );
    }

    const generated = generatePlaylistRotation(userRecipes, daysCount, pinnedSlots);
    const scheduleSlots = generated.map((g) => ({
      day: g.day,
      recipeId: g.recipe.id,
      locked: g.locked,
    }));

    const existing = await db.mealPlaylist.findFirst({
      where: { userId, active: true },
    });

    let playlistRecord;
    if (existing) {
      playlistRecord = await db.mealPlaylist.update({
        where: { id: existing.id },
        data: {
          daysCount,
          scheduleJson: JSON.stringify(scheduleSlots),
        },
      });
    } else {
      playlistRecord = await db.mealPlaylist.create({
        data: {
          name: 'The Platelist',
          daysCount,
          scheduleJson: JSON.stringify(scheduleSlots),
          active: true,
          userId,
        },
      });
    }

    const pantryItems = await db.pantryItem.findMany({ where: { userId } });
    const activePlaylistRecipes = generated.map((g) => g.recipe);
    const groceryDelta = computeGroceryDelta(activePlaylistRecipes, pantryItems);

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlistRecord.id,
        daysCount,
        slots: generated,
      },
      groceryDelta,
    });
  } catch (err) {
    console.error('Generate playlist error:', err);
    return NextResponse.json(
      { error: 'Failed to generate playlist: ' + (err as Error).message },
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
    const { action, day, recipeId } = body;

    let playlistRecord = await db.mealPlaylist.findFirst({
      where: { userId, active: true },
    });

    if (!playlistRecord || !playlistRecord.scheduleJson) {
      return NextResponse.json({ error: 'No active playlist found' }, { status: 404 });
    }

    let slots: { day: number; recipeId: string; locked?: boolean }[] = JSON.parse(
      playlistRecord.scheduleJson
    );

    const userRecipes = await getAllUserRecipes(userId);
    const activePool = userRecipes.filter((r) => r.frequency !== 'paused');

    if (action === 'swap') {
      const currentIds = new Set(slots.map((s) => s.recipeId));
      let candidates = activePool.filter((r) => !currentIds.has(r.id));
      if (candidates.length === 0) candidates = activePool;

      if (candidates.length === 0) {
        return NextResponse.json({ error: 'No replacement recipes available' }, { status: 400 });
      }

      const randomPick = candidates[Math.floor(Math.random() * candidates.length)];
      slots = slots.map((s) => (s.day === day ? { ...s, recipeId: randomPick.id, locked: false } : s));
    } else if (action === 'toggle_lock') {
      slots = slots.map((s) => (s.day === day ? { ...s, locked: !s.locked } : s));
    } else if (action === 'add_recipe' && recipeId) {
      const nextDay = slots.length + 1;
      slots.push({ day: nextDay, recipeId, locked: true });
    }

    await db.mealPlaylist.update({
      where: { id: playlistRecord.id },
      data: { scheduleJson: JSON.stringify(slots) },
    });

    return NextResponse.json({ success: true, slots });
  } catch (err) {
    console.error('Update playlist error:', err);
    return NextResponse.json(
      { error: 'Failed to update playlist: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
