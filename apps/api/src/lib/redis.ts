import { Redis } from '@upstash/redis';

// Lazy initialization to avoid build-time errors
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

    if (!url || !token) {
      throw new Error('Upstash Redis environment variables are not set. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    }
    _redis = new Redis({
      url,
      token,
    });
  }
  return _redis;
}

export const redis = new Proxy({} as Redis, {
  get: (_target, prop) => {
    const instance = getRedis();
    const value = (instance as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

// Rate limiting helper
export async function checkRateLimit(
  identifier: string,
  limit: number = 20,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count current requests
  const count = await redis.zcard(key);

  if (count >= limit) {
    const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true }) as Array<{ score: number; member: string }>;
    const resetAt = oldestEntry.length > 0
      ? Math.ceil(oldestEntry[0].score + windowSeconds)
      : now + windowSeconds;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Add new entry
  await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
  await redis.expire(key, windowSeconds);

  return {
    allowed: true,
    remaining: limit - count - 1,
    resetAt: now + windowSeconds,
  };
}

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function setCache<T>(
  key: string,
  value: T,
  expirationSeconds: number = 3600
): Promise<void> {
  await redis.set(key, value, { ex: expirationSeconds });
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

// Daily message limit for free tier users
export const FREE_TIER_DAILY_LIMIT = 20;

export async function checkDailyMessageLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  // Get the start of today (UTC)
  const now = new Date();
  const todayKey = `daily_messages:${userId}:${now.toISOString().split('T')[0]}`;

  // Get current count
  const currentCount = await redis.get<number>(todayKey) || 0;

  if (currentCount >= FREE_TIER_DAILY_LIMIT) {
    // Calculate reset time (midnight UTC)
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor(tomorrow.getTime() / 1000),
    };
  }

  return {
    allowed: true,
    remaining: FREE_TIER_DAILY_LIMIT - currentCount,
    resetAt: 0,
  };
}

export async function incrementDailyMessageCount(userId: string): Promise<number> {
  const now = new Date();
  const todayKey = `daily_messages:${userId}:${now.toISOString().split('T')[0]}`;

  // Increment and set expiry to end of day + 1 hour buffer
  const newCount = await redis.incr(todayKey);

  // Set expiry to ~25 hours from now to ensure cleanup
  await redis.expire(todayKey, 25 * 60 * 60);

  return newCount;
}

export async function getDailyMessageCount(userId: string): Promise<number> {
  const now = new Date();
  const todayKey = `daily_messages:${userId}:${now.toISOString().split('T')[0]}`;
  return await redis.get<number>(todayKey) || 0;
}
