import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageNumber, title, category, prepTime, cookTime, isFact } = await req.json();

    // Verify recipe belongs to a cookbook owned by user
    const recipe = await db.recipe.findFirst({
      where: {
        id: params.id,
        cookbook: {
          userId: session.user.id,
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const updated = await db.recipe.update({
      where: { id: params.id },
      data: {
        ...(pageNumber !== undefined && { pageNumber: pageNumber ? parseInt(String(pageNumber), 10) : null }),
        ...(title !== undefined && { title: title.trim() }),
        ...(category !== undefined && { category }),
        ...(prepTime !== undefined && { prepTime }),
        ...(cookTime !== undefined && { cookTime }),
        ...(isFact !== undefined ? { isFact } : { isFact: true }), // editing confirms it as Fact
      },
      include: {
        ingredients: true,
      },
    });

    return NextResponse.json({ success: true, recipe: updated });
  } catch (error) {
    console.error('Update recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
