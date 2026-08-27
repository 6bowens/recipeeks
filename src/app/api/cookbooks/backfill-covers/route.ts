import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchRealBookCover } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missingCookbooks = await db.cookbook.findMany({
      where: {
        userId: session.user.id,
        coverImageUrl: null,
      },
    });

    let updatedCount = 0;

    for (const cb of missingCookbooks) {
      const url = await fetchRealBookCover(cb.title, cb.author || undefined);
      if (url) {
        await db.cookbook.update({
          where: { id: cb.id },
          data: { coverImageUrl: url },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: missingCookbooks.length,
      updated: updatedCount,
    });
  } catch (error) {
    console.error('Backfill covers error:', error);
    return NextResponse.json(
      { error: 'Failed to backfill covers: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
