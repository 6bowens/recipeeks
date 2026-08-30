import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanRestaurantCocktailMenu } from '@/lib/gemini';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Budget Cap check
    const spendCheck = await checkUserAiSpend(userId);
    if (!spendCheck.allowed) {
      return NextResponse.json(
        {
          error: spendCheck.error,
          message: spendCheck.message,
          currentSpend: spendCheck.currentSpend,
          spendLimit: spendCheck.spendLimit,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { images } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No menu images provided' }, { status: 400 });
    }

    const formattedImages = images.map((img: { imageBase64: string; mimeType: string }) => ({
      base64Data: img.imageBase64,
      mimeType: img.mimeType || 'image/jpeg',
    }));

    const result = await scanRestaurantCocktailMenu(formattedImages);

    // Record AI cost (~$0.002 per image)
    const cost = Math.max(0.002, images.length * 0.0018);
    await recordAiSpend(userId, 'cocktail_menu_scan', cost, images.length * 600);

    // Log scan session
    try {
      await db.scanSession.create({
        data: {
          scanType: 'cocktail_menu',
          detectedCount: result.cocktails.length,
          rawOutput: JSON.stringify({
            restaurant: result.suggestedRestaurantName,
            cocktailsCount: result.cocktails.length,
          }).slice(0, 1000),
          userId,
        },
      });
    } catch (e) {
      console.warn('Could not record scanSession for cocktail menu:', e);
    }

    return NextResponse.json({
      success: true,
      suggestedRestaurantName: result.suggestedRestaurantName,
      city: result.city,
      cocktails: result.cocktails,
    });
  } catch (error) {
    console.error('Scan cocktail menu error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze cocktail menu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
