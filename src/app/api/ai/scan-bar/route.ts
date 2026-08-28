import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scanBarCartImage } from '@/lib/gemini';
import { db } from '@/lib/db';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';
import { isRecognizedBarStaple } from '@/lib/cocktail-utils';

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
    const { images, useDemoSample } = body;

    // Demo Bar Cart sample
    if (useDemoSample) {
      const sampleItems = [
        { name: 'Bourbon Whiskey (Buffalo Trace)', category: 'spirits', isAlwaysAvailable: false },
        { name: 'London Dry Gin (Tanqueray)', category: 'spirits', isAlwaysAvailable: false },
        { name: 'Blanco Tequila (Espolòn)', category: 'spirits', isAlwaysAvailable: false },
        { name: 'White Rum (Plantation 3 Stars)', category: 'spirits', isAlwaysAvailable: false },
        { name: 'Campari', category: 'liqueurs', isAlwaysAvailable: true },
        { name: 'Sweet Vermouth (Carpano Antica)', category: 'liqueurs', isAlwaysAvailable: true },
        { name: 'Dry Vermouth (Dolin)', category: 'liqueurs', isAlwaysAvailable: false },
        { name: 'Cointreau Triple Sec', category: 'liqueurs', isAlwaysAvailable: true },
        { name: 'Green Chartreuse', category: 'liqueurs', isAlwaysAvailable: false },
        { name: 'Angostura Aromatic Bitters', category: 'bitters_syrups', isAlwaysAvailable: true },
        { name: 'Orange Bitters (Regans)', category: 'bitters_syrups', isAlwaysAvailable: true },
        { name: 'Simple Syrup', category: 'bitters_syrups', isAlwaysAvailable: true },
        { name: 'Fresh Lemons', category: 'produce', isAlwaysAvailable: true },
        { name: 'Fresh Limes', category: 'produce', isAlwaysAvailable: true },
        { name: 'Club Soda (Fever-Tree)', category: 'mixers', isAlwaysAvailable: false },
        { name: 'Luxardo Maraschino Cherries', category: 'ice_garnishes', isAlwaysAvailable: true },
      ];

      return NextResponse.json({
        success: true,
        items: sampleItems,
        message: 'Sample home speakeasy bar cart loaded.',
      });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No bar cart images provided' }, { status: 400 });
    }

    const formattedImages = images.map((img: { imageBase64: string; mimeType: string }) => ({
      base64Data: img.imageBase64,
      mimeType: img.mimeType || 'image/jpeg',
    }));

    const items = await scanBarCartImage(formattedImages);

    // Record AI cost
    const cost = Math.max(0.002, images.length * 0.0015);
    await recordAiSpend(userId, 'fridge_scan', cost, images.length * 500);

    // Save session
    await db.scanSession.create({
      data: {
        scanType: 'bar_cart',
        detectedCount: Array.isArray(items) ? items.length : 0,
        rawOutput: JSON.stringify(items).slice(0, 1000),
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      items: Array.isArray(items)
        ? items.map((i: any) => ({
            ...i,
            isAlwaysAvailable: i.isAlwaysAvailable || isRecognizedBarStaple(i.name),
          }))
        : [],
    });
  } catch (error) {
    console.error('Scan bar error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze bar cart: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
