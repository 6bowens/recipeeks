import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchRealBookCover } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookbook = await db.cookbook.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        recipes: {
          include: {
            ingredients: true,
          },
          orderBy: [{ pageNumber: 'asc' }, { title: 'asc' }],
        },
      },
    });

    if (!cookbook) {
      return NextResponse.json({ error: 'Cookbook not found' }, { status: 404 });
    }

    // Auto-backfill cover if missing
    if (!cookbook.coverImageUrl) {
      const fetched = await fetchRealBookCover(cookbook.title, cookbook.author || undefined);
      if (fetched) {
        await db.cookbook.update({
          where: { id: cookbook.id },
          data: { coverImageUrl: fetched },
        });
        cookbook.coverImageUrl = fetched;
      }
    }

    return NextResponse.json({ cookbook });
  } catch (error) {
    console.error('Fetch cookbook details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cookbook: ' + (error as Error).message },
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coverImageUrl, title, author, edition, coverColor } = await req.json();

    const cookbook = await db.cookbook.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!cookbook) {
      return NextResponse.json({ error: 'Cookbook not found' }, { status: 404 });
    }

    const updated = await db.cookbook.update({
      where: { id: params.id },
      data: {
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(title !== undefined && { title: title.trim() }),
        ...(author !== undefined && { author: author?.trim() || null }),
        ...(edition !== undefined && { edition: edition?.trim() || null }),
        ...(coverColor !== undefined && { coverColor }),
      },
    });

    return NextResponse.json({ success: true, cookbook: updated });
  } catch (error) {
    console.error('Update cookbook error:', error);
    return NextResponse.json(
      { error: 'Failed to update cookbook: ' + (error as Error).message },
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookbook = await db.cookbook.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!cookbook) {
      return NextResponse.json({ error: 'Cookbook not found' }, { status: 404 });
    }

    await db.cookbook.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Cookbook deleted' });
  } catch (error) {
    console.error('Delete cookbook error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cookbook: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
