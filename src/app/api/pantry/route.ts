import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName, isRecognizedKitchenStaple } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.pantryItem.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isAlwaysAvailable: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Fetch pantry error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pantry: ' + (error as Error).message },
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

    // Bulk Import with Smart Deduplication, Upsert, and Optional Fresh Fridge Reset
    if (Array.isArray(body.items)) {
      const savedItems = [];
      const userId = session.user.id;
      const replaceFridge = !!body.replaceFridge;

      // If replaceFridge is requested, get all existing non-staple fridge items to prune unseen ones
      let existingFridgeNonStaples: { id: string; normalizedName: string | null }[] = [];
      if (replaceFridge) {
        existingFridgeNonStaples = await db.pantryItem.findMany({
          where: {
            userId,
            category: 'fridge',
            isAlwaysAvailable: false,
          },
          select: { id: true, normalizedName: true },
        });
      }

      for (const item of body.items) {
        if (!item.name) continue;
        const normalized = normalizeIngredientName(item.name);
        const isStaple = !!item.isAlwaysAvailable || isRecognizedKitchenStaple(item.name);

        const existing = await db.pantryItem.findFirst({
          where: { userId, normalizedName: normalized },
        });

        if (existing) {
          // Update existing item with any new quantity or promote to staple if applicable
          const updated = await db.pantryItem.update({
            where: { id: existing.id },
            data: {
              ...(item.quantity && { quantity: item.quantity }),
              ...(item.category && { category: item.category }),
              isAlwaysAvailable: isStaple || existing.isAlwaysAvailable,
            },
          });
          savedItems.push(updated);
        } else {
          // Create new non-duplicate item
          const created = await db.pantryItem.create({
            data: {
              name: item.name.trim(),
              normalizedName: normalized,
              category: item.category || (isStaple ? 'pantry' : 'fridge'),
              quantity: item.quantity || null,
              isAlwaysAvailable: isStaple,
              userId,
            },
          });
          savedItems.push(created);
        }
      }

      let staleRemovedCount = 0;
      if (replaceFridge && existingFridgeNonStaples.length > 0) {
        const savedIds = new Set(savedItems.map((i) => i.id));
        const toDeleteIds = existingFridgeNonStaples
          .filter((f) => !savedIds.has(f.id))
          .map((f) => f.id);

        if (toDeleteIds.length > 0) {
          const deleteResult = await db.pantryItem.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
          staleRemovedCount = deleteResult.count;
        }
      }

      return NextResponse.json(
        {
          success: true,
          count: savedItems.length,
          staleRemovedCount,
          items: savedItems,
        },
        { status: 201 }
      );
    }

    // Single item add with deduplication
    const { name, category, quantity, isAlwaysAvailable } = body;

    if (!name) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const normalized = normalizeIngredientName(name);
    const isStaple = !!isAlwaysAvailable || isRecognizedKitchenStaple(name);
    const userId = session.user.id;

    const existing = await db.pantryItem.findFirst({
      where: { userId, normalizedName: normalized },
    });

    if (existing) {
      const updated = await db.pantryItem.update({
        where: { id: existing.id },
        data: {
          quantity: quantity || existing.quantity,
          category: category || existing.category,
          isAlwaysAvailable: isStaple || existing.isAlwaysAvailable,
        },
      });
      return NextResponse.json({ success: true, item: updated, isDuplicate: true }, { status: 200 });
    }

    const item = await db.pantryItem.create({
      data: {
        name: name.trim(),
        normalizedName: normalized,
        category: category || (isStaple ? 'pantry' : 'fridge'),
        quantity: quantity || null,
        isAlwaysAvailable: isStaple,
        userId,
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error('Add pantry item error:', error);
    return NextResponse.json(
      { error: 'Failed to add pantry item: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, isAlwaysAvailable, quantity, category, name } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const existing = await db.pantryItem.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pantry item not found' }, { status: 404 });
    }

    const updated = await db.pantryItem.update({
      where: { id },
      data: {
        ...(name && { name: name.trim(), normalizedName: normalizeIngredientName(name) }),
        ...(isAlwaysAvailable !== undefined && { isAlwaysAvailable }),
        ...(quantity !== undefined && { quantity }),
        ...(category !== undefined && { category }),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Update pantry item error:', error);
    return NextResponse.json(
      { error: 'Failed to update pantry item: ' + (error as Error).message },
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
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ error: 'Item ID or name is required' }, { status: 400 });
    }

    if (id) {
      await db.pantryItem.deleteMany({
        where: { id, userId: session.user.id },
      });
    }

    if (name) {
      const norm = normalizeIngredientName(name);
      const userPantry = await db.pantryItem.findMany({
        where: { userId: session.user.id },
      });

      const toDeleteIds = userPantry
        .filter((item) => {
          const itemNorm = item.normalizedName || normalizeIngredientName(item.name);
          return (
            item.name.toLowerCase() === name.toLowerCase().trim() ||
            itemNorm === norm ||
            itemNorm.includes(norm) ||
            norm.includes(itemNorm)
          );
        })
        .map((i) => i.id);

      if (toDeleteIds.length > 0) {
        await db.pantryItem.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Item removed from pantry' });
  } catch (error) {
    console.error('Delete pantry item error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pantry item: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
