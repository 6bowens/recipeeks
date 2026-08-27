import { db } from '@/lib/db';

export const DEFAULT_AI_SPEND_LIMIT_USD = 20.0;

export interface SpendCheckResult {
  allowed: boolean;
  currentSpend: number;
  spendLimit: number;
  adminNotified?: boolean;
  error?: string;
  message?: string;
}

/**
 * Checks if the user is allowed to perform AI operations or has exceeded the $20 budget.
 */
export async function checkUserAiSpend(userId: string): Promise<SpendCheckResult> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { aiSpendUsd: true, spendLimitUsd: true, adminNotified: true },
    });

    const currentSpend = user?.aiSpendUsd || 0.0;
    const spendLimit = user?.spendLimitUsd || DEFAULT_AI_SPEND_LIMIT_USD;
    const adminNotified = user?.adminNotified || false;

    if (currentSpend >= spendLimit) {
      return {
        allowed: false,
        currentSpend,
        spendLimit,
        adminNotified,
        error: 'AI_SPEND_LIMIT_EXCEEDED',
        message: `You have reached the $${spendLimit.toFixed(2)} AI budget limit. Subsequent AI scanning has been paused. Please notify your admin to review and extend your limit.`,
      };
    }

    return {
      allowed: true,
      currentSpend,
      spendLimit,
      adminNotified,
    };
  } catch (error) {
    console.error('Error checking user AI spend:', error);
    // Fail open in case of read glitch, or default safe
    return {
      allowed: true,
      currentSpend: 0,
      spendLimit: DEFAULT_AI_SPEND_LIMIT_USD,
    };
  }
}

/**
 * Record an AI operation cost and increment the user's cumulative spend.
 */
export async function recordAiSpend(
  userId: string,
  actionType: 'bookshelf_scan' | 'recipe_index' | 'index_ocr' | 'fridge_scan' | 'cover_gen',
  costUsd: number = 0.01,
  promptChars: number = 0
): Promise<void> {
  try {
    await db.$transaction([
      db.aiUsageLog.create({
        data: {
          userId,
          actionType,
          costUsd,
          promptChars,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: {
          aiSpendUsd: {
            increment: costUsd,
          },
        },
      }),
    ]);
  } catch (error) {
    console.error('Error recording AI spend:', error);
  }
}

/**
 * Mark that the user has requested admin review / notification.
 */
export async function markAdminNotified(userId: string): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { adminNotified: true },
    });
    return true;
  } catch (error) {
    console.error('Error marking admin notified:', error);
    return false;
  }
}
