import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generatePlaylistRotation, computeGroceryDelta } from '@/lib/playlist-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user recipes
    const userRecipes = await db.customRecipe.findMany({
      where: { userId },
      include: { ingredients: true },
    });

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
            name: 'Dinner Rotation',
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
      // If recipe doesn't exist or is paused (0x), replace it with an unpaused active recipe
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
        // Strictly exclude any paused recipes
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

    const userRecipes = await db.customRecipe.findMany({
      where: { userId },
      include: { ingredients: true },
    });

    const activeRecipes = userRecipes.filter((r) => r.frequency !== 'paused');

    if (activeRecipes.length === 0) {
      return NextResponse.json(
        { error: 'Please unpause or add recipes to your Mise vault first before generating a playlist.' },
        { status: 400 }
      );
    }

    const generated = generatePlaylistRotation(userRecipes, daysCount, pinnedSlots);
    const scheduleSlots = generated.map((g) => ({
      day: g.day,
      recipeId: g.recipe.id,
      locked: g.locked,
    }));

    // Update or create active playlist record
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
          name: 'Dinner Rotation',
          daysCount,
          scheduleJson: JSON.stringify(scheduleSlots),
          active: true,
          userId,
        },
      });
    }

    // Compute Grocery Delta
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
    const { action, day, newRecipeId, toggleLock } = body;

    const userRecipes = await db.customRecipe.findMany({
      where: { userId },
      include: { ingredients: true },
    });

    const playlistRecord = await db.mealPlaylist.findFirst({
      where: { userId, active: true },
    });

    if (!playlistRecord) {
      return NextResponse.json({ error: 'No active playlist found' }, { status: 404 });
    }

    let scheduledSlots: { day: number; recipeId: string; locked?: boolean }[] = JSON.parse(
      playlistRecord.scheduleJson || '[]'
    );

    if (action === 'swap') {
      // Find candidate recipes not currently in the playlist and not paused
      const currentRecipeIds = new Set(scheduledSlots.map((s) => s.recipeId));
      let pool = userRecipes.filter((r) => !currentRecipeIds.has(r.id) && r.frequency !== 'paused');
      if (pool.length === 0) {
        // Fallback: any active unpaused recipe other than the current day's recipe
        const currentSlot = scheduledSlots.find((s) => s.day === day);
        pool = userRecipes.filter((r) => r.id !== currentSlot?.recipeId && r.frequency !== 'paused');
      }

      if (pool.length === 0) {
        return NextResponse.json({ error: 'No other unpaused recipes available to swap.' }, { status: 400 });
      }

      // Pick random weighted candidate
      const targetRecipe = newRecipeId
        ? userRecipes.find((r) => r.id === newRecipeId && r.frequency !== 'paused') || pool[0]
        : pool[Math.floor(Math.random() * pool.length)];

      scheduledSlots = scheduledSlots.map((s) =>
        s.day === day ? { ...s, recipeId: targetRecipe.id, locked: false } : s
      );
    } else if (action === 'lock') {
      scheduledSlots = scheduledSlots.map((s) =>
        s.day === day ? { ...s, locked: toggleLock !== undefined ? toggleLock : !s.locked } : s
      );
    }

    await db.mealPlaylist.update({
      where: { id: playlistRecord.id },
      data: {
        scheduleJson: JSON.stringify(scheduledSlots),
      },
    });

    // Hydrate & recompute grocery delta
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

    const pantryItems = await db.pantryItem.findMany({ where: { userId } });
    const groceryDelta = computeGroceryDelta(
      hydratedSlots.map((s) => s.recipe),
      pantryItems
    );

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlistRecord.id,
        daysCount: playlistRecord.daysCount,
        slots: hydratedSlots,
      },
      groceryDelta,
    });
  } catch (err) {
    console.error('Update playlist slot error:', err);
    return NextResponse.json(
      { error: 'Failed to update playlist: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
