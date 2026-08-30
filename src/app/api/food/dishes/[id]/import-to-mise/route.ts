import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const dishId = params.id;

    const dish = await db.restaurantDish.findUnique({
      where: { id: dishId },
      include: {
        menu: true,
        ingredients: true,
      },
    });

    if (!dish) {
      return NextResponse.json({ error: 'Restaurant dish not found' }, { status: 404 });
    }

    let instructionsText = dish.instructions || '';
    try {
      if (dish.instructions) {
        const parsed = JSON.parse(dish.instructions);
        if (Array.isArray(parsed)) {
          instructionsText = parsed.map((s, idx) => `${idx + 1}. ${s}`).join('\n\n');
        }
      }
    } catch (e) {
      // Keep as string
    }

    const notesWithOrigin = [
      `Restaurant Origin: ${dish.menu.restaurantName}${dish.menu.city ? ` (${dish.menu.city})` : ''}`,
      dish.chefTips ? `Chef Secret: ${dish.chefTips}` : null,
      dish.menuDescription ? `Menu Description: ${dish.menuDescription}` : null,
    ].filter(Boolean).join('\n\n');

    // Create CustomRecipe in user's Mise en place rotation
    const customRecipe = await db.customRecipe.create({
      data: {
        title: dish.name,
        sourceType: 'restaurant_menu',
        cookbookTitle: dish.menu.restaurantName,
        servings: dish.servings || '2-4',
        prepTime: dish.prepTime || '15 mins',
        cookTime: dish.cookTime || '25 mins',
        instructions: instructionsText,
        notes: notesWithOrigin,
        frequency: '1_week',
        userId,
        ingredients: {
          create: dish.ingredients.map((ing) => ({
            name: ing.name,
            normalizedName: ing.normalizedName || normalizeIngredientName(ing.name),
            amount: ing.amount,
            unit: ing.unit,
            aisleCategory: ing.aisleCategory || 'pantry',
            optional: ing.optional,
          })),
        },
      },
      include: {
        ingredients: true,
      },
    });

    return NextResponse.json({
      success: true,
      recipe: customRecipe,
      message: `✓ Added "${dish.name}" from ${dish.menu.restaurantName} to your Mise en Place Dinner Rotation!`,
    });
  } catch (error) {
    console.error('Import restaurant dish to Mise error:', error);
    return NextResponse.json(
      { error: 'Failed to import dish: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
