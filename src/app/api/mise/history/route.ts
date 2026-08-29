import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cleanRecipeText } from '@/lib/playlist-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await db.mealHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { cookedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
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
