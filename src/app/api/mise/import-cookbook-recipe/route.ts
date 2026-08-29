import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';
import { deduceAisleCategory } from '@/lib/playlist-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipeId, frequency = '1_week' } = await req.json();

    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Fetch the physical cookbook recipe
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        cookbook: true,
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Cookbook recipe not found' }, { status: 404 });
    }

    // Check if already in Mise vault for this user
    const existing = await db.customRecipe.findFirst({
      where: {
        userId: session.user.id,
        title: recipe.title,
        cookbookTitle: recipe.cookbook.title,
      },
      include: { ingredients: true },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        recipe: existing,
        message: `"${recipe.title}" is already in your Mise Vault!`,
      });
    }

    const created = await db.customRecipe.create({
      data: {
        title: recipe.title,
        sourceType: 'cookbook',
        cookbookTitle: recipe.cookbook.title,
        pageNumber: recipe.pageNumber,
        servings: recipe.servings || '2-4',
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        frequency,
        instructions: JSON.stringify([
          `Reference page ${recipe.pageNumber || 'index'} in "${recipe.cookbook.title}" for preparation instructions.`,
        ]),
        notes: `Imported from "${recipe.cookbook.title}"`,
        userId: session.user.id,
        ingredients: {
          create: recipe.ingredients.map((ing) => ({
            name: ing.name,
            normalizedName: ing.normalizedName || normalizeIngredientName(ing.name),
            amount: ing.amount,
            unit: ing.unit,
            aisleCategory: deduceAisleCategory(ing.name),
            optional: ing.optional,
          })),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json({
      success: true,
      recipe: created,
      message: `✨ Added "${recipe.title}" to Mise!`,
    });
  } catch (err) {
    console.error('Import cookbook recipe error:', err);
    return NextResponse.json(
      { error: 'Failed to import recipe: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
