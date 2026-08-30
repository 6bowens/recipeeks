import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';

    // Fetch user inventory if logged in for stock matching
    let userInventory: { name: string; norm: string }[] = [];
    if (userId) {
      const items = await db.pantryItem.findMany({
        where: { userId },
        select: { name: true, normalizedName: true },
      });
      userInventory = items.map((i) => ({
        name: i.name,
        norm: i.normalizedName || normalizeIngredientName(i.name),
      }));
    }

    const isStocked = (ingName: string) => {
      if (userInventory.length === 0) return false;
      const targetNorm = normalizeIngredientName(ingName);
      return userInventory.some((item) => {
        if (item.norm === targetNorm) return true;
        if (item.name.toLowerCase() === ingName.toLowerCase()) return true;
        if (targetNorm.includes(item.norm) || item.norm.includes(targetNorm)) return true;
        const tokens = targetNorm.split(' ').filter((w) => w.length > 2);
        return tokens.some((tok) => item.norm.includes(tok));
      });
    };

    // Query global menus
    const menus = await db.restaurantMenu.findMany({
      where: query
        ? {
            OR: [
              { restaurantName: { contains: query } },
              { city: { contains: query } },
              {
                cocktails: {
                  some: {
                    OR: [
                      { name: { contains: query } },
                      { menuDescription: { contains: query } },
                      { ingredients: { some: { name: { contains: query } } } },
                    ],
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        cocktails: {
          include: {
            ingredients: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedMenus = menus.map((m) => {
      const formattedCocktails = m.cocktails.map((c) => {
        let matchedCount = 0;
        const totalCount = c.ingredients.length;
        const ingredientsWithStock = c.ingredients.map((ing) => {
          const stocked = isStocked(ing.name) || ing.optional;
          if (stocked) matchedCount++;
          return {
            id: ing.id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            optional: ing.optional,
            isStocked: stocked,
          };
        });

        const matchScore = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

        let instructionsArray: string[] = [];
        try {
          if (c.instructions) {
            instructionsArray = JSON.parse(c.instructions);
          }
        } catch (e) {
          instructionsArray = c.instructions ? [c.instructions] : [];
        }

        return {
          id: c.id,
          name: c.name,
          menuDescription: c.menuDescription,
          spiritBase: c.spiritBase,
          flavorProfile: c.flavorProfile,
          glassware: c.glassware,
          ice: c.ice,
          technique: c.technique,
          garnish: c.garnish,
          instructions: instructionsArray,
          matchScore,
          matchedCount,
          totalIngredientsCount: totalCount,
          ingredients: ingredientsWithStock,
        };
      });

      return {
        id: m.id,
        restaurantName: m.restaurantName,
        city: m.city,
        notes: m.notes,
        imageUrl: m.imageUrl,
        contributedBy: m.user?.name || m.user?.email?.split('@')[0] || 'Community Chef',
        isOwner: m.userId === userId,
        createdAt: m.createdAt,
        totalDrinks: m.cocktails.length,
        cocktails: formattedCocktails,
      };
    });

    return NextResponse.json({
      success: true,
      menus: formattedMenus,
      totalCount: formattedMenus.length,
    });
  } catch (error) {
    console.error('Fetch restaurant menus error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant menus: ' + (error as Error).message },
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

    const userId = session.user.id;
    const body = await req.json();
    const { restaurantName, city, notes, imageUrl, cocktails } = body;

    if (!restaurantName || !restaurantName.trim()) {
      return NextResponse.json({ error: 'Restaurant / Bar Name is required.' }, { status: 400 });
    }

    if (!cocktails || !Array.isArray(cocktails) || cocktails.length === 0) {
      return NextResponse.json({ error: 'At least one cocktail is required.' }, { status: 400 });
    }

    const createdMenu = await db.restaurantMenu.create({
      data: {
        restaurantName: restaurantName.trim(),
        city: city?.trim() || null,
        notes: notes?.trim() || null,
        imageUrl: imageUrl || null,
        userId,
        cocktails: {
          create: cocktails.map((c: any) => ({
            name: c.name.trim(),
            menuDescription: c.menuDescription?.trim() || null,
            spiritBase: c.spiritBase || 'Mixed Spirits',
            flavorProfile: c.flavorProfile || 'sour',
            glassware: c.glassware || 'Coupe',
            ice: c.ice || 'Served Up',
            technique: c.technique || 'Shaken',
            garnish: c.garnish?.trim() || null,
            instructions: Array.isArray(c.instructions)
              ? JSON.stringify(c.instructions)
              : typeof c.instructions === 'string'
              ? JSON.stringify([c.instructions])
              : null,
            ingredients: {
              create: (c.ingredients || []).map((ing: any) => ({
                name: ing.name.trim(),
                normalizedName: normalizeIngredientName(ing.name),
                amount: ing.amount ? String(ing.amount).trim() : null,
                unit: ing.unit ? String(ing.unit).trim() : null,
                optional: !!ing.optional,
              })),
            },
          })),
        },
      },
      include: {
        cocktails: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      menu: createdMenu,
      message: `Menu for "${createdMenu.restaurantName}" published globally with ${createdMenu.cocktails.length} cocktails!`,
    });
  } catch (error) {
    console.error('Save restaurant menu error:', error);
    return NextResponse.json(
      { error: 'Failed to save restaurant menu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
