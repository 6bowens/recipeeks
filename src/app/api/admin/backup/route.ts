import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'sqlite'; // 'sqlite' or 'json'

    if (format === 'json') {
      // Export full user dataset as clean JSON
      const [cookbooks, customRecipes, pantryItems, playlists, mealHistory, favorites, restaurantMenus] =
        await Promise.all([
          db.cookbook.findMany({
            where: { userId: session.user.id },
            include: { recipes: { include: { ingredients: true } } },
          }),
          db.customRecipe.findMany({
            where: { userId: session.user.id },
            include: { ingredients: true },
          }),
          db.pantryItem.findMany({
            where: { userId: session.user.id },
          }),
          db.mealPlaylist.findMany({
            where: { userId: session.user.id },
          }),
          db.mealHistory.findMany({
            where: { userId: session.user.id },
          }),
          db.favorite.findMany({
            where: { userId: session.user.id },
          }),
          db.restaurantMenu.findMany({
            where: { userId: session.user.id },
            include: {
              dishes: { include: { ingredients: true } },
              cocktails: { include: { ingredients: true } },
            },
          }),
        ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        stats: {
          cookbooksCount: cookbooks.length,
          cookbookRecipesCount: cookbooks.reduce((acc, c) => acc + c.recipes.length, 0),
          customRecipesCount: customRecipes.length,
          pantryItemsCount: pantryItems.length,
          favoritesCount: favorites.length,
          menusCount: restaurantMenus.length,
        },
        cookbooks,
        customRecipes,
        pantryItems,
        playlists,
        mealHistory,
        favorites,
        restaurantMenus,
      };

      return new NextResponse(JSON.stringify(exportPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="recipeeks_backup_${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // Default: SQLite binary download
    const possiblePaths = [
      '/app/data/recipeeks.db',
      path.join(process.cwd(), 'data', 'recipeeks.db'),
      path.join(process.cwd(), 'prisma', 'dev.db'),
    ];

    let dbPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!dbPath) {
      return NextResponse.json({ error: 'Database file not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="recipeeks_backup_${new Date().toISOString().slice(0, 10)}.db"`,
      },
    });
  } catch (err) {
    console.error('Backup export error:', err);
    return NextResponse.json(
      { error: 'Failed to generate backup: ' + (err as Error).message },
      { status: 500 }
    );
  }
}
