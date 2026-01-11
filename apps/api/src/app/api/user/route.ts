import { NextRequest, NextResponse } from 'next/server';
import { sql, getSubscription } from '@/lib/db';
import { getDailyMessageCount } from '@/lib/redis';

// Helper to get user ID from auth header
function getUserIdFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    console.log('[User API] Fetching user:', userId);
    const user = await sql`
      SELECT id, email, name, created_at, updated_at
      FROM users WHERE id = ${userId}
    ` as Array<{ id: string; email: string; name: string | null; created_at: string; updated_at: string }>;

    if (user.length === 0) {
      console.log('[User API] User not found:', userId);
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
      console.error('[User API] Subscription fetch failed, using default:', subError);
    }

    // Fetch daily message usage for free tier (with fallback)
    let dailyMessagesUsed = 0;
    if (subscription.tier === 'free') {
      try {
        dailyMessagesUsed = await getDailyMessageCount(userId);
      } catch (redisError) {
        console.error('[User API] Redis fetch failed, defaulting to 0:', redisError);
      }
    }

    console.log('[User API] User fetched successfully:', user[0].email);
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
    console.error('[User API] Failed to fetch user:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      { status: 500 }
    );
  }
}
