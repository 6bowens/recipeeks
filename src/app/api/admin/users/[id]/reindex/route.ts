import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { indexCookbookRecipes } from '@/lib/gemini';
import { normalizeIngredientName } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 mins for batch re-indexing

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    const isDirectAdmin = session?.user?.email && isUserAdmin(session.user.email);
    const isImpersonator =
      (session?.user as any)?.originalAdminEmail &&
      isUserAdmin((session?.user as any).originalAdminEmail);

    if (!isDirectAdmin && !isImpersonator) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const targetUserId = params.id;
    const body = await req.json().catch(() => ({}));
    const { cookbookId, onlyLowCount = false } = body;

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    // Find cookbooks to re-index
    const cookbooks = await db.cookbook.findMany({
      where: {
        userId: targetUserId,
        ...(cookbookId ? { id: cookbookId } : {}),
      },
      include: {
        _count: { select: { recipes: true } },
      },
    });

    const booksToProcess = onlyLowCount
      ? cookbooks.filter((b) => b._count.recipes <= 5)
      : cookbooks;

    if (booksToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No cookbooks matched criteria for re-indexing.',
        processedCount: 0,
        totalRecipesIndexed: 0,
      });
    }

    const results = [];
    let totalRecipesAdded = 0;

    for (let i = 0; i < booksToProcess.length; i++) {
      const book = booksToProcess[i];
      try {
        const recipes = await indexCookbookRecipes(book.title, book.author || undefined, false);

        if (recipes && recipes.length > 0) {
          // Delete old recipes
          await db.recipe.deleteMany({
            where: { cookbookId: book.id },
          });

          // Insert new recipes with nested ingredients
          for (const r of recipes) {
            await db.recipe.create({
              data: {
                title: r.title,
                pageNumber: r.pageNumber ? Number(r.pageNumber) : null,
                isFact: r.isFact !== undefined ? r.isFact : true,
                category: r.category || 'Main',
                prepTime: r.prepTime || null,
                cookTime: r.cookTime || null,
                servings: r.servings ? String(r.servings) : null,
                sourceUrl: r.sourceUrl || null,
                cookbookId: book.id,
                ingredients: {
                  create: (r.ingredients || []).map((ing) => ({
                    name: ing.name,
                    normalizedName: normalizeIngredientName(ing.name),
                    amount: ing.amount ? String(ing.amount) : null,
                    unit: ing.unit || null,
                    optional: !!ing.optional,
                  })),
                },
              },
            });
          }

          await db.cookbook.update({
            where: { id: book.id },
            data: { totalRecipes: recipes.length },
          });

          totalRecipesAdded += recipes.length;
          results.push({
            cookbookId: book.id,
            title: book.title,
            recipesCount: recipes.length,
            status: 'success',
          });
        } else {
          results.push({
            cookbookId: book.id,
            title: book.title,
            recipesCount: 0,
            status: 'no_recipes_extracted',
          });
        }
      } catch (err) {
        console.error(`Admin re-index error for "${book.title}":`, err);
        results.push({
          cookbookId: book.id,
          title: book.title,
          status: 'error',
          error: (err as Error).message,
        });
      }

      // Small pacing delay between books to stay under rate limits
      if (i < booksToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: targetUser.id, email: targetUser.email },
      processedCount: results.filter((r) => r.status === 'success').length,
      totalBooks: booksToProcess.length,
      totalRecipesIndexed: totalRecipesAdded,
      results,
    });
  } catch (error) {
    console.error('Batch re-index error:', error);
    return NextResponse.json(
      { error: 'Failed to re-index cookbooks: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
