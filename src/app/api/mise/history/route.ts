import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cleanRecipeText, FREQUENCY_CONFIG } from '@/lib/playlist-utils';

export const dynamic = 'force-dynamic';

export interface DishFrequencyStat {
  recipeTitle: string;
  recipeId: string | null;
  sourceType: string | null;
  totalCount: number;
  firstCookedAt: string;
  lastCookedAt: string;
  daysSinceLastCooked: number;
  averageDaysBetweenMeals: number | null;
  actualFrequencyLabel: string;
  targetFrequency: string | null;
  targetFrequencyLabel: string | null;
  status: 'recently_cooked' | 'due_soon' | 'overdue' | 'new';
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [history, customRecipes] = await Promise.all([
      db.mealHistory.findMany({
        where: { userId },
        orderBy: { cookedAt: 'desc' },
      }),
      db.customRecipe.findMany({
        where: { userId },
      }),
    ]);

    const now = new Date();

    // Group history entries by normalized recipe title
    const grouped = new Map<
      string,
      {
        title: string;
        recipeId: string | null;
        sourceType: string | null;
        entries: typeof history;
      }
    >();

    history.forEach((entry) => {
      const key = entry.recipeTitle.toLowerCase().trim();
      const existing = grouped.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        grouped.set(key, {
          title: entry.recipeTitle,
          recipeId: entry.recipeId,
          sourceType: entry.sourceType,
          entries: [entry],
        });
      }
    });

    const dishStats: DishFrequencyStat[] = [];

    grouped.forEach((val) => {
      const sortedDates = val.entries
        .map((e) => new Date(e.cookedAt))
        .sort((a, b) => a.getTime() - b.getTime());

      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      const count = val.entries.length;

      const msDiff = now.getTime() - lastDate.getTime();
      const daysSinceLast = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));

      // Find linked custom recipe for target cadence
      const linkedRecipe = customRecipes.find(
        (r) =>
          (val.recipeId && r.id === val.recipeId) ||
          r.title.toLowerCase().trim() === val.title.toLowerCase().trim()
      );

      const targetFreq = linkedRecipe?.frequency || null;
      const targetFreqMeta = targetFreq ? FREQUENCY_CONFIG[targetFreq] : null;

      let averageDaysBetween: number | null = null;
      let actualFreqLabel = `${count} time${count === 1 ? '' : 's'} total`;

      if (count > 1) {
        const totalSpanDays = Math.max(
          1,
          Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        averageDaysBetween = Math.max(1, Math.round(totalSpanDays / (count - 1)));

        if (averageDaysBetween <= 4) {
          actualFreqLabel = `Every ~${averageDaysBetween} days (~${(7 / averageDaysBetween).toFixed(1)}x / week)`;
        } else if (averageDaysBetween <= 9) {
          actualFreqLabel = `Every ~${averageDaysBetween} days (~1x / week)`;
        } else if (averageDaysBetween <= 18) {
          actualFreqLabel = `Every ~${averageDaysBetween} days (~2x / month)`;
        } else if (averageDaysBetween <= 40) {
          actualFreqLabel = `Every ~${averageDaysBetween} days (~1x / month)`;
        } else {
          actualFreqLabel = `Every ~${Math.round(averageDaysBetween / 30)} months`;
        }
      } else {
        actualFreqLabel = `Cooked 1x so far`;
      }

      // Compute status based on target vs days since last cooked
      let status: DishFrequencyStat['status'] = 'recently_cooked';
      const targetDays =
        targetFreq === '1_week'
          ? 7
          : targetFreq === '2_month'
          ? 14
          : targetFreq === '1_month'
          ? 30
          : 60;

      if (count === 1 && daysSinceLast > 14) {
        status = 'due_soon';
      } else if (daysSinceLast > targetDays * 1.4) {
        status = 'overdue';
      } else if (daysSinceLast >= targetDays * 0.8) {
        status = 'due_soon';
      } else {
        status = 'recently_cooked';
      }

      dishStats.push({
        recipeTitle: val.title,
        recipeId: val.recipeId,
        sourceType: val.sourceType,
        totalCount: count,
        firstCookedAt: firstDate.toISOString(),
        lastCookedAt: lastDate.toISOString(),
        daysSinceLastCooked: daysSinceLast,
        averageDaysBetweenMeals: averageDaysBetween,
        actualFrequencyLabel: actualFreqLabel,
        targetFrequency: targetFreq,
        targetFrequencyLabel: targetFreqMeta ? targetFreqMeta.shortLabel : null,
        status,
      });
    });

    // Sort stats by highest total count first, then most recently cooked
    dishStats.sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return new Date(b.lastCookedAt).getTime() - new Date(a.lastCookedAt).getTime();
    });

    return NextResponse.json({
      success: true,
      history: history.slice(0, 100),
      dishStats,
      totalMealsLogged: history.length,
      uniqueDishesCount: dishStats.length,
    });
  } catch (err) {
    console.error('Fetch meal history error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch meal history: ' + (err as Error).message },
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
    const { recipeTitle, recipeId, sourceType = 'custom', notes, rating = 5, cookedAt } = body;

    if (!recipeTitle || !recipeTitle.trim()) {
      return NextResponse.json({ error: 'Recipe title is required' }, { status: 400 });
    }

    const entry = await db.mealHistory.create({
      data: {
        recipeTitle: cleanRecipeText(recipeTitle),
        recipeId: recipeId || null,
        sourceType,
        notes: notes ? cleanRecipeText(notes) : null,
        rating: rating ? parseInt(String(rating)) : 5,
        cookedAt: cookedAt ? new Date(cookedAt) : new Date(),
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      entry,
      message: `✨ Logged "${recipeTitle}" to your meal history!`,
    });
  } catch (err) {
    console.error('Log meal history error:', err);
    return NextResponse.json(
      { error: 'Failed to log meal history: ' + (err as Error).message },
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
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    await db.mealHistory.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete history error:', err);
    return NextResponse.json(
      { error: 'Failed to delete history entry: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
