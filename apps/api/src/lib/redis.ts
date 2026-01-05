import { Redis } from '@upstash/redis';

// Lazy initialization to avoid build-time errors
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis environment variables are not set');
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
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
