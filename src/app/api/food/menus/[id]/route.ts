import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const menuId = params.id;

    const existingMenu = await db.restaurantMenu.findUnique({
      where: { id: menuId },
    });

    if (!existingMenu) {
      return NextResponse.json({ error: 'Restaurant menu not found' }, { status: 404 });
    }

    const isAdmin = session.user.email === '6bowens@gmail.com';
    if (existingMenu.userId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this menu' },
        { status: 403 }
      );
    }

    await db.restaurantMenu.delete({
      where: { id: menuId },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted menu for "${existingMenu.restaurantName}"`,
    });
  } catch (error) {
    console.error('Delete restaurant menu error:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
