import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const cookbooks = await db.cookbook.findMany({
      where: { userId: session.user.id },
      include: {
        recipes: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    const pantryItems = await db.pantryItem.findMany({
      where: { userId: session.user.id },
    });

    const totalBooks = cookbooks.length;
    const totalRecipes = cookbooks.reduce((acc, c) => acc + c.recipes.length, 0);

    const allIngredients = new Set<string>();
    cookbooks.forEach((c) => {
      c.recipes.forEach((r) => {
        r.ingredients.forEach((i) => allIngredients.add(i.normalizedName));
      });
    });

    const summary = {
      exportedAt: new Date().toISOString(),
      user: session.user.email,
      totalBooks,
      totalRecipes,
      totalUniqueIngredients: allIngredients.size,
      totalPantryItems: pantryItems.length,
    };

    if (format === 'csv') {
      const csvRows = [
        ['Cookbook Title', 'Author', 'Recipe Title', 'Page Number', 'Type (Fact/Inferred)', 'Ingredients List'],
      ];

      for (const book of cookbooks) {
        for (const recipe of book.recipes) {
          const ingList = recipe.ingredients.map((i) => `${i.amount || ''} ${i.unit || ''} ${i.name}`.trim()).join('; ');
          csvRows.push([
            `"${book.title.replace(/"/g, '""')}"`,
            `"${(book.author || '').replace(/"/g, '""')}"`,
            `"${recipe.title.replace(/"/g, '""')}"`,
            recipe.pageNumber ? recipe.pageNumber.toString() : '',
            recipe.isFact ? 'Fact' : 'Inferred',
            `"${ingList.replace(/"/g, '""')}"`,
          ]);
        }
      }

      const csvString = csvRows.map((r) => r.join(',')).join('\n');

      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="recipeeks-library-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary,
      cookbooks,
      pantryItems,
    });
  } catch (error) {
    console.error('Export stats error:', error);
    return NextResponse.json(
      { error: 'Failed to export library stats: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
