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
    const categoryFilter = searchParams.get('category')?.toLowerCase().trim() || '';

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

    // Query global restaurant menus that have food dishes
    const menus = await db.restaurantMenu.findMany({
      where: {
        dishes: {
          some: {
            ...(categoryFilter && categoryFilter !== 'all' ? { category: { contains: categoryFilter } } : {}),
            ...(query
              ? {
                  OR: [
                    { name: { contains: query } },
                    { menuDescription: { contains: query } },
                    { chefTips: { contains: query } },
                    { ingredients: { some: { name: { contains: query } } } },
                  ],
                }
              : {}),
          },
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        dishes: {
          where: categoryFilter && categoryFilter !== 'all' ? { category: { contains: categoryFilter } } : undefined,
          include: {
            ingredients: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedMenus = menus.map((m) => {
      const formattedDishes = m.dishes.map((d) => {
        let matchedCount = 0;
        const totalCount = d.ingredients.length;
        const ingredientsWithStock = d.ingredients.map((ing) => {
          const stocked = isStocked(ing.name) || ing.optional;
          if (stocked) matchedCount++;
          return {
            id: ing.id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            aisleCategory: ing.aisleCategory,
            optional: ing.optional,
            isStocked: stocked,
          };
        });

        const matchScore = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

        let instructionsArray: string[] = [];
        try {
          if (d.instructions) {
            instructionsArray = JSON.parse(d.instructions);
          }
        } catch (e) {
          instructionsArray = d.instructions ? [d.instructions] : [];
        }

        let dietaryTagsArray: string[] = [];
        if (d.dietaryTags) {
          try {
            dietaryTagsArray = JSON.parse(d.dietaryTags);
          } catch (e) {
            dietaryTagsArray = d.dietaryTags.split(',').map((t) => t.trim()).filter(Boolean);
          }
        }

        return {
          id: d.id,
          name: d.name,
          category: d.category || 'Main',
          menuDescription: d.menuDescription,
          prepTime: d.prepTime,
          cookTime: d.cookTime,
          servings: d.servings || '2-4 servings',
          difficulty: d.difficulty || 'Medium',
          dietaryTags: dietaryTagsArray,
          chefTips: d.chefTips,
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
        totalDishes: m.dishes.length,
        dishes: formattedDishes,
      };
    });

    return NextResponse.json({
      success: true,
      menus: formattedMenus,
      totalCount: formattedMenus.length,
    });
  } catch (error) {
    console.error('Fetch restaurant food menus error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch restaurant food menus: ' + (error as Error).message },
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
    const { restaurantName, city, notes, imageUrl, dishes } = body;

    if (!restaurantName || !restaurantName.trim()) {
      return NextResponse.json({ error: 'Restaurant Name is required.' }, { status: 400 });
    }

    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json({ error: 'At least one dish is required.' }, { status: 400 });
    }

    const createdMenu = await db.restaurantMenu.create({
      data: {
        restaurantName: restaurantName.trim(),
        city: city?.trim() || null,
        notes: notes?.trim() || null,
        imageUrl: imageUrl || null,
        menuType: 'food',
        userId,
        dishes: {
          create: dishes.map((d: any) => ({
            name: d.name.trim(),
            category: d.category || 'Main',
            menuDescription: d.menuDescription?.trim() || null,
            prepTime: d.prepTime || '15 mins',
            cookTime: d.cookTime || '25 mins',
            servings: d.servings || '2-4 servings',
            difficulty: d.difficulty || 'Medium',
            dietaryTags: Array.isArray(d.dietaryTags)
              ? JSON.stringify(d.dietaryTags)
              : typeof d.dietaryTags === 'string'
              ? JSON.stringify(d.dietaryTags.split(',').map((s: string) => s.trim()))
              : null,
            chefTips: d.chefTips?.trim() || null,
            instructions: Array.isArray(d.instructions)
              ? JSON.stringify(d.instructions)
              : typeof d.instructions === 'string'
              ? JSON.stringify([d.instructions])
              : null,
            ingredients: {
              create: (d.ingredients || []).map((ing: any) => ({
                name: ing.name.trim(),
                normalizedName: normalizeIngredientName(ing.name),
                amount: ing.amount ? String(ing.amount).trim() : null,
                unit: ing.unit ? String(ing.unit).trim() : null,
                aisleCategory: ing.aisleCategory || 'pantry',
                optional: !!ing.optional,
              })),
            },
          })),
        },
      },
      include: {
        dishes: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      menu: createdMenu,
      message: `Menu for "${createdMenu.restaurantName}" published globally with ${createdMenu.dishes.length} dishes!`,
    });
  } catch (error) {
    console.error('Save restaurant food menu error:', error);
    return NextResponse.json(
      { error: 'Failed to save restaurant food menu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
