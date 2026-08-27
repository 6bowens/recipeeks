import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
