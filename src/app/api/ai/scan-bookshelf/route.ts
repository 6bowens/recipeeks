import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanBookshelfImage } from '@/lib/gemini';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';
import { ExtractedCookbook } from '@/types';

export const dynamic = 'force-dynamic';

function cleanTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const COCKTAIL_KEYWORDS = /\b(cocktail|cocktails|mixology|bartender|bartending|drinks|spirits|bourbon|whiskey|gin|rum|tequila|vodka|liquor|liqueur|death & co|smuggler's cove|speakeasy|craft cocktail)\b/i;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
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
    }

    const body = await req.json();

    const { imageBase64, mimeType, skipCocktails, limitFirstOnly, useDemoSample } = body;

    let books: ExtractedCookbook[];

    if (useDemoSample || !imageBase64) {
      books = await scanBookshelfImage('', 'image/jpeg', {
        skipCocktails: !!skipCocktails,
        limitFirstOnly: !!limitFirstOnly,
      });
    } else {
      // Strip potential data URL prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      books = await scanBookshelfImage(cleanBase64, mimeType || 'image/jpeg', {
        skipCocktails: !!skipCocktails,
        limitFirstOnly: !!limitFirstOnly,
      });
    }

    // Strict safety filter for cocktail books if skipCocktails is enabled
    if (skipCocktails) {
      books = books.filter((b) => {
        const text = `${b.title} ${b.author || ''} ${b.spineSnippet || ''} ${b.edition || ''}`;
        return !b.isCocktailBook && !COCKTAIL_KEYWORDS.test(text);
      });
    }

    // Check user's existing cookbooks for deduplication
    let existingTitles: string[] = [];
    if (session?.user?.id) {
      const existing = await db.cookbook.findMany({
        where: { userId: session.user.id },
        select: { title: true },
      });
      existingTitles = existing.map((c) => cleanTitle(c.title));

      // Record scan session in DB
      await db.scanSession.create({
        data: {
          scanType: 'bookshelf',
          detectedCount: books.length,
          rawOutput: JSON.stringify(books),
          userId: session.user.id,
        },
      });
    }

    // Flag books that already exist in library
    const enrichedBooks = books.map((b) => {
      const bTitle = cleanTitle(b.title);
      const isDuplicate = existingTitles.some(
        (ext) => ext === bTitle || ext.includes(bTitle) || bTitle.includes(ext)
      );
      return {
        ...b,
        alreadyInLibrary: isDuplicate,
      };
    });

    if (session?.user?.id) {
      await recordAiSpend(session.user.id, 'bookshelf_scan', 0.02, imageBase64?.length || 0);
    }

    return NextResponse.json({
      success: true,
      count: enrichedBooks.length,
      books: enrichedBooks,
    });
  } catch (error) {
    console.error('Scan bookshelf error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to analyze bookshelf.' },
      { status: 500 }
    );
  }
}
