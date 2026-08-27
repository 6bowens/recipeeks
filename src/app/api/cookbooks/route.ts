import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateCoverColor, fetchRealBookCover } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Non-blocking asynchronous cover fetcher
async function backfillMissingCoversInBackground(cookbooks: { id: string; title: string; author?: string | null; coverImageUrl?: string | null }[]) {
  for (const cb of cookbooks) {
    if (!cb.coverImageUrl) {
      try {
        const url = await fetchRealBookCover(cb.title, cb.author || undefined);
        if (url) {
          await db.cookbook.update({
            where: { id: cb.id },
            data: { coverImageUrl: url },
          });
        }
      } catch (e) {
        // continue
      }
    }
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookbooks = await db.cookbook.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { recipes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check if any covers are missing and trigger non-blocking background backfill
    const missingCoverBooks = cookbooks.filter((cb) => !cb.coverImageUrl);
    if (missingCoverBooks.length > 0) {
      // Fire and forget background worker (never blocks the HTTP response)
      backfillMissingCoversInBackground(missingCoverBooks).catch((err) => {
        console.warn('Background cover backfill error:', err);
      });
    }

    const totalCookbooks = cookbooks.length;
    const totalRecipes = cookbooks.reduce((acc, c) => acc + c._count.recipes, 0);

    const ingredients = await db.ingredient.findMany({
      where: {
        recipe: {
          cookbook: {
            userId: session.user.id,
          },
        },
      },
      select: {
        normalizedName: true,
      },
      distinct: ['normalizedName'],
    });

    // Compute estimated AI spend based on vision scans & recorded usage
    const [scanSessions, userRecord] = await Promise.all([
      db.scanSession.findMany({
        where: { userId: session.user.id },
        select: { scanType: true },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { aiSpendUsd: true },
      }),
    ]);

    const totalVisionScans = scanSessions.length;
    const historicalCost = (totalVisionScans * 0.0015) + (totalCookbooks * 0.004);
    const effectiveCost = Math.max(userRecord?.aiSpendUsd || 0, historicalCost);

    return NextResponse.json({
      cookbooks,
      hasMissingCovers: missingCoverBooks.length > 0,
      stats: {
        totalCookbooks,
        totalRecipes,
        totalUniqueIngredients: ingredients.length,
        totalVisionScans,
        estimatedAiSpend: effectiveCost < 0.01 && effectiveCost > 0 ? `< $0.01` : `$${effectiveCost.toFixed(2)}`,
        estimatedAiSpendExact: `$${effectiveCost.toFixed(4)}`,
      },
    });
  } catch (error) {
    console.error('Fetch cookbooks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cookbooks: ' + (error as Error).message },
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

    const { title, author, edition, coverColor } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const coverImageUrl = await fetchRealBookCover(title, author);

    const cookbook = await db.cookbook.create({
      data: {
        title,
        author: author || null,
        edition: edition || null,
        coverColor: coverColor || generateCoverColor(title),
        coverImageUrl: coverImageUrl || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, cookbook }, { status: 201 });
  } catch (error) {
    console.error('Create cookbook error:', error);
    return NextResponse.json(
      { error: 'Failed to create cookbook: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
