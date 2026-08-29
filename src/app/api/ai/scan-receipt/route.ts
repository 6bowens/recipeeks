import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanGroceryReceiptImage } from '@/lib/gemini';
import { normalizeIngredientName } from '@/lib/utils';
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
    const { photos, imageBase64, mimeType } = body;

    let items: any[] = [];

    if (Array.isArray(photos) && photos.length > 0) {
      const formatted = photos.map((p) => ({
        base64Data: p.base64 || p.data || p,
        mimeType: p.type || p.mimeType || 'image/jpeg',
      }));
      items = await scanGroceryReceiptImage(formatted);
    } else if (imageBase64) {
      items = await scanGroceryReceiptImage(imageBase64, mimeType || 'image/jpeg');
    } else {
      // Demo mock
      items = await scanGroceryReceiptImage('');
    }

    const formattedItems = items.map((it) => ({
      name: it.name,
      normalizedName: normalizeIngredientName(it.name),
      category: it.category || 'pantry',
      quantity: it.quantity || null,
      price: it.price || null,
      isAlwaysAvailable: !!it.isAlwaysAvailable,
    }));

    if (session?.user?.id) {
      await recordAiSpend(session.user.id, 'receipt_scan', 0.015, (imageBase64 || '').length || 1000);
    }

    return NextResponse.json({
      success: true,
      items: formattedItems,
      detectedCount: formattedItems.length,
    });
  } catch (error) {
    console.error('Scan receipt error:', error);
    return NextResponse.json(
      { error: 'Failed to scan receipt: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
