import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { indexCookbookRecipes } from '@/lib/gemini';
import { generateCoverColor, normalizeIngredientName, fetchRealBookCover } from '@/lib/utils';
import { checkUserAiSpend, recordAiSpend } from '@/lib/spend';
import { ExtractedCookbook } from '@/types';

export const dynamic = 'force-dynamic';

function cleanTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to import cookbooks.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check $20 budget cap
    const spend = await checkUserAiSpend(userId);
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

    const { books, sampleOnly, forceReindex } = (await req.json()) as {
      books: ExtractedCookbook[];
      sampleOnly?: boolean;
      forceReindex?: boolean;
    };

    if (!books || !Array.isArray(books) || books.length === 0) {
      return NextResponse.json(
        { error: 'No books provided for indexing.' },
        { status: 400 }
      );
    }

    // Fetch existing books to prevent duplicate indexing
    const existingCookbooks = await db.cookbook.findMany({
      where: { userId },
      select: { id: true, title: true },
    });

    const existingCleanTitles = existingCookbooks.map((c) => ({
      id: c.id,
      clean: cleanTitle(c.title),
    }));

    let totalImportedBooks = 0;
    let totalSkippedBooks = 0;
    let totalImportedRecipes = 0;
    const uniqueIngredientsSet = new Set<string>();

    const createdCookbooks = [];

    for (const book of books) {
      if (!book.title) continue;

      const currentClean = cleanTitle(book.title);
      const duplicate = existingCleanTitles.find(
        (e) => e.clean === currentClean || e.clean.includes(currentClean) || currentClean.includes(e.clean)
      );

      if (duplicate && !forceReindex) {
        totalSkippedBooks++;
        continue;
      }

      // Extract recipes using Gemini AI
      const recipes = await indexCookbookRecipes(book.title, book.author, !!sampleOnly);
      const coverColor = generateCoverColor(book.title);
      const coverImageUrl = await fetchRealBookCover(book.title, book.author);

      // Create Cookbook record in DB
      const cookbook = await db.cookbook.create({
        data: {
          title: book.title,
          author: book.author || null,
          edition: book.edition || null,
          coverColor,
          coverImageUrl: coverImageUrl || null,
          spineSnippet: book.spineSnippet || null,
          totalRecipes: recipes.length,
          userId,
        },
      });

      // Insert all recipes and their nested ingredients
      for (const r of recipes) {
        const createdRecipe = await db.recipe.create({
          data: {
            title: r.title,
            pageNumber: r.pageNumber || null,
            isFact: r.isFact !== undefined ? r.isFact : true,
            category: r.category || 'Main',
            prepTime: r.prepTime || null,
            cookTime: r.cookTime || null,
            servings: r.servings || null,
            sourceUrl: r.sourceUrl || null,
            cookbookId: cookbook.id,
          },
        });

        if (r.ingredients && Array.isArray(r.ingredients)) {
          for (const ing of r.ingredients) {
            if (!ing.name) continue;
            const normalized = normalizeIngredientName(ing.name);
            uniqueIngredientsSet.add(normalized);

            await db.ingredient.create({
              data: {
                name: ing.name,
                normalizedName: normalized,
                amount: ing.amount || null,
                unit: ing.unit || null,
                optional: !!ing.optional,
                recipeId: createdRecipe.id,
              },
            });
          }
        }
        totalImportedRecipes++;
      }

      totalImportedBooks++;
      createdCookbooks.push({
        id: cookbook.id,
        title: cookbook.title,
        author: cookbook.author,
        recipesCount: recipes.length,
        coverColor,
      });

      // Record spend per cookbook indexed (~$0.02)
      await recordAiSpend(userId, 'recipe_index', 0.02, book.title.length);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${totalImportedBooks} new cookbook(s) and ${totalImportedRecipes} recipe(s). ${
        totalSkippedBooks > 0 ? `(${totalSkippedBooks} already in library skipped)` : ''
      }`,
      summary: {
        totalBooks: totalImportedBooks,
        totalSkipped: totalSkippedBooks,
        totalRecipes: totalImportedRecipes,
        totalUniqueIngredients: uniqueIngredientsSet.size,
      },
      cookbooks: createdCookbooks,
    });
  } catch (error) {
    console.error('Error indexing recipes:', error);
    return NextResponse.json(
      { error: 'Failed to index recipes: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
