import { NextRequest, NextResponse } from 'next/server';
import { sql, getSubscription } from '@/lib/db';
import { getDailyMessageCount } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { getUserIdFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    const user = await sql`
      SELECT id, email, name, created_at, updated_at
      FROM users WHERE id = ${userId}
    ` as Array<{ id: string; email: string; name: string | null; created_at: string; updated_at: string }>;

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Fetch subscription data (with fallback)
    let subscription: { tier: 'free' | 'pro'; status: 'active' | 'canceled' | 'past_due' | 'trialing'; periodEnd: string | null } = { tier: 'free', status: 'active', periodEnd: null };
    try {
      subscription = await getSubscription(userId);
    } catch (subError) {
      logger.error('[User API] Subscription fetch failed, using default:', subError);
    }

    // Fetch daily message usage for free tier (with fallback)
    let dailyMessagesUsed = 0;
    if (subscription.tier === 'free') {
      try {
        dailyMessagesUsed = await getDailyMessageCount(userId);
      } catch (redisError) {
        logger.error('[User API] Redis fetch failed, defaulting to 0:', redisError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          createdAt: user[0].created_at,
          updatedAt: user[0].updated_at,
        },
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          periodEnd: subscription.periodEnd,
          dailyMessagesUsed,
          dailyMessagesLimit: subscription.tier === 'free' ? 20 : null,
        },
      },
    });
  } catch (error) {
    logger.error('[User API] Failed to fetch user:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      { status: 500 }
    );
  }
}
