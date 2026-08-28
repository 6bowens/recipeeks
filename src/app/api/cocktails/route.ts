import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Fetch Cocktail Books & their recipes
    const cocktailBooks = await db.cookbook.findMany({
      where: {
        userId,
        OR: [
          { bookType: 'cocktail' },
          { bookType: 'both' },
          { recipes: { some: { category: { contains: 'Cocktail' } } } },
        ],
      },
      include: {
        recipes: {
          include: {
            ingredients: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch Bar items (Pantry items under bar categories or staples)
    const barCategories = ['spirits', 'liqueurs', 'mixers', 'bitters_syrups', 'produce', 'ice_garnishes'];
    const barItems = await db.pantryItem.findMany({
      where: {
        userId,
        OR: [
          { category: { in: barCategories } },
          { category: 'bar' },
        ],
      },
      orderBy: [{ isAlwaysAvailable: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    // Total cocktail recipes count
    const totalCocktailRecipes = cocktailBooks.reduce((acc, b) => acc + b.recipes.length, 0);

    return NextResponse.json({
      success: true,
      cocktailBooks,
      barItems,
      stats: {
        totalCocktailBooks: cocktailBooks.length,
        totalCocktailRecipes,
        totalBarBottles: barItems.length,
      },
    });
  } catch (error) {
    console.error('Fetch cocktails error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cocktail data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
