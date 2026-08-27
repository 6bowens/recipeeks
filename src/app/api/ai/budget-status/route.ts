import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkUserAiSpend, markAdminNotified } from '@/lib/spend';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await checkUserAiSpend(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch budget status: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await markAdminNotified(session.user.id);
    return NextResponse.json({ success, message: 'Admin has been notified of your budget increase request.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to notify admin: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
