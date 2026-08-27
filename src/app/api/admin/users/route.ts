import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isUserAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Access denied: Admin privileges required.' }, { status: 403 });
    }

    // Aggregate metrics
    const [totalUsers, totalCookbooks, totalRecipes, totalPantryItems, totalScanSessions] = await Promise.all([
      db.user.count(),
      db.cookbook.count(),
      db.recipe.count(),
      db.pantryItem.count(),
      db.scanSession.count(),
    ]);

    // Fetch all users with nested counts
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        aiSpendUsd: true,
        spendLimitUsd: true,
        adminNotified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cookbooks: true,
            pantryItems: true,
            scanSessions: true,
            aiLogs: true,
          },
        },
        cookbooks: {
          select: {
            totalRecipes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute user summaries
    const userList = users.map((u) => {
      const recipesCount = u.cookbooks.reduce((sum, c) => sum + (c.totalRecipes || 0), 0);
      const historicalEstimate = (u._count.scanSessions * 0.0015) + (u._count.cookbooks * 0.004);
      const effectiveSpend = Math.max(u.aiSpendUsd, historicalEstimate);

      return {
        id: u.id,
        email: u.email,
        name: u.name || u.email.split('@')[0],
        aiSpendUsd: Number(effectiveSpend.toFixed(2)),
        spendLimitUsd: u.spendLimitUsd,
        adminNotified: u.adminNotified,
        isLimitReached: effectiveSpend >= u.spendLimitUsd,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        stats: {
          cookbooksCount: u._count.cookbooks,
          recipesCount,
          pantryItemsCount: u._count.pantryItems,
          scanSessionsCount: u._count.scanSessions,
          aiLogsCount: u._count.aiLogs,
        },
      };
    });

    const totalAiSpend = userList.reduce((sum, u) => sum + u.aiSpendUsd, 0);
    const pendingAlerts = userList.filter((u) => u.adminNotified || u.isLimitReached).length;

    // Fetch recent 15 AI Logs across system
    const recentLogs = await db.aiUsageLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers,
        totalCookbooks,
        totalRecipes,
        totalPantryItems,
        totalScanSessions,
        totalAiSpend: Number(totalAiSpend.toFixed(2)),
        pendingAlerts,
      },
      users: userList,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        actionType: log.actionType,
        costUsd: log.costUsd,
        promptChars: log.promptChars,
        createdAt: log.createdAt,
        userEmail: log.user.email,
        userName: log.user.name || log.user.email.split('@')[0],
      })),
    });
  } catch (error) {
    console.error('Admin fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load admin metrics: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
