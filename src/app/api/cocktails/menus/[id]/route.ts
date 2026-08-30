import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
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

    const { id } = params;
    const userId = session.user.id;
    const userEmail = session.user.email;
    const isAdmin = userEmail && isUserAdmin(userEmail);

    const existingMenu = await db.restaurantMenu.findUnique({
      where: { id },
    });

    if (!existingMenu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    if (existingMenu.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only delete menus you created.' }, { status: 403 });
    }

    await db.restaurantMenu.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Menu for "${existingMenu.restaurantName}" has been deleted.`,
    });
  } catch (error) {
    console.error('Delete menu error:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
