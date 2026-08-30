import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isUserAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Access denied: Admin privileges required.' }, { status: 403 });
    }

    const { id } = params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        cookbooks: {
          include: {
            _count: { select: { recipes: true } },
          },
          orderBy: { title: 'asc' },
        },
        _count: {
          select: {
            cookbooks: true,
            pantryItems: true,
            scanSessions: true,
            customRecipes: true,
            mealHistory: true,
            aiLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        aiSpendUsd: user.aiSpendUsd,
        spendLimitUsd: user.spendLimitUsd,
        adminNotified: user.adminNotified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        cookbooks: user.cookbooks.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          coverColor: b.coverColor,
          coverImageUrl: b.coverImageUrl,
          totalRecipes: b._count.recipes,
          bookType: b.bookType,
          createdAt: b.createdAt,
        })),
        counts: user._count,
      },
    });
  } catch (error) {
    console.error('Fetch user detail admin error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isUserAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Access denied: Admin privileges required.' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { spendLimitUsd, resetSpend, clearAlert } = body;

    const dataToUpdate: any = {};

    if (spendLimitUsd !== undefined && typeof spendLimitUsd === 'number') {
      dataToUpdate.spendLimitUsd = spendLimitUsd;
    }

    if (resetSpend) {
      dataToUpdate.aiSpendUsd = 0.0;
      dataToUpdate.adminNotified = false;
    }

    if (clearAlert) {
      dataToUpdate.adminNotified = false;
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        aiSpendUsd: true,
        spendLimitUsd: true,
        adminNotified: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user admin error:', error);
    return NextResponse.json(
      { error: 'Failed to update user: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isUserAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Access denied: Admin privileges required.' }, { status: 403 });
    }

    const { id } = params;

    // Prevent deleting oneself
    const targetUser = await db.user.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.email.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot delete your own admin account.' }, { status: 400 });
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `User ${targetUser.email} and all data removed.` });
  } catch (error) {
    console.error('Delete user admin error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
