import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanFridgeOrPantryImage } from '@/lib/gemini';
import { db } from '@/lib/db';
import { normalizeIngredientName, isRecognizedKitchenStaple } from '@/lib/utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';

export const dynamic = 'force-dynamic';

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

    const { images, imageBase64, mimeType, useDemoSample } = body;

    let detectedList;

    if (useDemoSample) {
      detectedList = await scanFridgeOrPantryImage('');
    } else if (Array.isArray(images) && images.length > 0) {
      detectedList = await scanFridgeOrPantryImage(
        images.map((img: any) => ({
          base64Data: img.imageBase64 || img.data,
          mimeType: img.mimeType || 'image/jpeg',
        }))
      );
    } else if (imageBase64) {
      detectedList = await scanFridgeOrPantryImage(
        imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        mimeType || 'image/jpeg'
      );
    } else {
      detectedList = await scanFridgeOrPantryImage('');
    }

    // Cross-reference with existing pantry items in DB
    let existingItemsMap = new Map<string, any>();
    if (session?.user?.id) {
      const existing = await db.pantryItem.findMany({
        where: { userId: session.user.id },
      });
      existing.forEach((item) => {
        existingItemsMap.set(item.normalizedName, item);
      });

      // Record scan session
      await db.scanSession.create({
        data: {
          scanType: 'fridge',
          detectedCount: detectedList.length,
          rawOutput: JSON.stringify(detectedList),
          userId: session.user.id,
        },
      });
    }

    // Enrich with deduplication and staple metadata
    const enriched = detectedList.map((item) => {
      const normalized = normalizeIngredientName(item.name);
      const existing = existingItemsMap.get(normalized);
      const isStaple = item.isAlwaysAvailable || isRecognizedKitchenStaple(item.name);

      return {
        ...item,
        normalizedName: normalized,
        isAlwaysAvailable: isStaple,
        alreadyInPantry: !!existing,
        existingId: existing?.id,
        existingQuantity: existing?.quantity,
      };
    });

    if (session?.user?.id) {
      await recordAiSpend(session.user.id, 'fridge_scan', 0.015, (images?.length || 1) * 100);
    }

    return NextResponse.json({
      success: true,
      count: enriched.length,
      items: enriched,
    });
  } catch (error) {
    console.error('Scan fridge error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to analyze fridge/pantry photos.' },
      { status: 500 }
    );
  }
}
