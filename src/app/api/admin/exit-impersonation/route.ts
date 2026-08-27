import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    const originalAdminEmail = (session?.user as any)?.originalAdminEmail;

    if (!originalAdminEmail || !isUserAdmin(originalAdminEmail)) {
      return NextResponse.json({ error: 'No active admin impersonation session found.' }, { status: 400 });
    }

    const adminUser = await db.user.findUnique({
      where: { email: originalAdminEmail },
      select: { id: true, email: true },
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin account not found.' }, { status: 404 });
    }

    const secretKey = process.env.NEXTAUTH_SECRET || 'recipeeks-default-dev-secret-key-321';

    return NextResponse.json({
      success: true,
      targetUserId: adminUser.id,
      adminEmail: adminUser.email,
      secretKey,
    });
  } catch (error) {
    console.error('Exit impersonation error:', error);
    return NextResponse.json(
      { error: 'Failed to exit impersonation: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
