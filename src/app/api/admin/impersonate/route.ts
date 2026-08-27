import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const isDirectAdmin = session?.user?.email && isUserAdmin(session.user.email);
    const isImpersonator = (session?.user as any)?.originalAdminEmail && isUserAdmin((session?.user as any).originalAdminEmail);

    if (!isDirectAdmin && !isImpersonator) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    const adminEmail = (session?.user as any)?.originalAdminEmail || session?.user?.email;
    const secretKey = process.env.NEXTAUTH_SECRET || 'recipeeks-default-dev-secret-key-321';

    return NextResponse.json({
      success: true,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
      adminEmail,
      secretKey,
    });
  } catch (error) {
    console.error('Impersonation token error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate impersonation: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
