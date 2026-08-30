import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanRestaurantFoodMenu } from '@/lib/gemini';
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

    const result = await scanRestaurantFoodMenu(formattedImages);

    // Record AI cost (~$0.002 per image)
    const cost = Math.max(0.002, images.length * 0.0018);
    await recordAiSpend(userId, 'food_menu_scan', cost, images.length * 700);

    // Log scan session
    try {
      await db.scanSession.create({
        data: {
          scanType: 'food_menu',
          detectedCount: result.dishes.length,
          rawOutput: JSON.stringify({
            restaurant: result.suggestedRestaurantName,
            dishesCount: result.dishes.length,
          }).slice(0, 1000),
          userId,
        },
      });
    } catch (e) {
      console.warn('Could not record scanSession for food menu:', e);
    }

    return NextResponse.json({
      success: true,
      suggestedRestaurantName: result.suggestedRestaurantName,
      city: result.city,
      dishes: result.dishes,
    });
  } catch (error) {
    console.error('Scan food menu error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze food menu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
