import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';
import { deduceAisleCategory } from '@/lib/playlist-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipes = await db.customRecipe.findMany({
      where: { userId: session.user.id },
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      recipes,
      count: recipes.length,
    });
  } catch (err) {
    console.error('Fetch recipes error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch recipes: ' + (err as Error).message },
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
    const {
      title,
      sourceType = 'manual',
      sourceUrl,
      cookbookTitle,
      pageNumber,
      frequency = '1_week',
      servings = '2-4',
      prepTime,
      cookTime,
      instructions,
      notes,
      ingredients = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Recipe title is required' }, { status: 400 });
    }

    const created = await db.customRecipe.create({
      data: {
        title: title.trim(),
        sourceType,
        sourceUrl,
        cookbookTitle,
        pageNumber: pageNumber ? parseInt(String(pageNumber)) : null,
        frequency,
        servings,
        prepTime,
        cookTime,
        instructions: typeof instructions === 'string' ? instructions : JSON.stringify(instructions || []),
        notes,
        userId: session.user.id,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            name: ing.name.trim(),
            normalizedName: normalizeIngredientName(ing.name),
            amount: ing.amount ? String(ing.amount).trim() : null,
            unit: ing.unit ? String(ing.unit).trim() : null,
            aisleCategory: ing.aisleCategory || deduceAisleCategory(ing.name),
            optional: !!ing.optional,
          })),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json({
      success: true,
      recipe: created,
    });
  } catch (err) {
    console.error('Create recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to create recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, frequency, title, servings, prepTime, cookTime, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const updated = await db.customRecipe.updateMany({
      where: { id, userId: session.user.id },
      data: {
        ...(frequency !== undefined ? { frequency } : {}),
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(servings !== undefined ? { servings } : {}),
        ...(prepTime !== undefined ? { prepTime } : {}),
        ...(cookTime !== undefined ? { cookTime } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      updated: updated.count,
    });
  } catch (err) {
    console.error('Update recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to update recipe: ' + (err as Error).message },
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

    if (!id) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    await db.customRecipe.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to delete recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
