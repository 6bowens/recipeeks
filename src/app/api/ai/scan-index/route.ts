import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanIndexPageImage } from '@/lib/gemini';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';

export const dynamic = 'force-dynamic';

function cleanTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spend = await checkUserAiSpend(session.user.id);
    if (!spend.allowed) {
      return NextResponse.json(
        {
          error: spend.error,
          message: spend.message,
          currentSpend: spend.currentSpend,
          spendLimit: spend.spendLimit,
        },
        { status: 429 }
      );
    }

    const { cookbookId, imageBase64, mimeType } = await req.json();

    if (!cookbookId || !imageBase64) {
      return NextResponse.json(
        { error: 'Cookbook ID and image are required.' },
        { status: 400 }
      );
    }

    const cookbook = await db.cookbook.findFirst({
      where: { id: cookbookId, userId: session.user.id },
      include: { recipes: true },
    });

    if (!cookbook) {
      return NextResponse.json({ error: 'Cookbook not found' }, { status: 404 });
    }

    const detectedEntries = await scanIndexPageImage(imageBase64, mimeType || 'image/jpeg');

    let updatedCount = 0;
    let newCount = 0;

    for (const entry of detectedEntries) {
      const cleanEntryTitle = cleanTitle(entry.title);

      // Match against existing recipes in this book
      const existing = cookbook.recipes.find((r) => {
        const rTitle = cleanTitle(r.title);
        return rTitle === cleanEntryTitle || rTitle.includes(cleanEntryTitle) || cleanEntryTitle.includes(rTitle);
      });

      if (existing) {
        await db.recipe.update({
          where: { id: existing.id },
          data: {
            pageNumber: entry.pageNumber,
            isFact: true,
          },
        });
        updatedCount++;
      } else {
        // Create new recipe entry from verified index
        await db.recipe.create({
          data: {
            title: entry.title,
            pageNumber: entry.pageNumber,
            category: entry.category || 'Main',
            isFact: true,
            cookbookId: cookbook.id,
          },
        });
        newCount++;
      }
    }

    await recordAiSpend(session.user.id, 'index_ocr', 0.015, imageBase64?.length || 0);

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} existing page numbers and added ${newCount} new recipes from the physical index.`,
      detectedCount: detectedEntries.length,
      updatedCount,
      newCount,
    });
  } catch (error) {
    console.error('Scan index error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to scan index page.' },
      { status: 500 }
    );
  }
}
