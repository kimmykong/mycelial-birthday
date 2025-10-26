import { getRedis } from './db';

interface RateLimitConfig {
  key: string;
  limit: number;
  window: number; // in seconds
}

/**
 * Check if a request is rate limited
 * @param config - Rate limit configuration
 * @returns true if rate limited, false if allowed
 */
export async function isRateLimited(config: RateLimitConfig): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    // If Redis is not available, allow the request (fail open)
    return false;
  }

  const { key, limit, window } = config;
  const redisKey = `ratelimit:${key}`;

  try {
    // Increment the counter
    const current = await redis.incr(redisKey);

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(redisKey, window);
    }

    // Check if limit exceeded
    return current > limit;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow the request if Redis has issues
    return false;
  }
}

/**
 * Get rate limit info for a key
 */
export async function getRateLimitInfo(config: RateLimitConfig): Promise<{
  remaining: number;
  reset: number;
}> {
  const redis = getRedis();
  if (!redis) {
    return { remaining: config.limit, reset: 0 };
  }

  const { key, limit } = config;
  const redisKey = `ratelimit:${key}`;

  try {
    const [current, ttl] = await Promise.all([
      redis.get(redisKey),
      redis.ttl(redisKey)
    ]);

    const count = current ? parseInt(current) : 0;
    const remaining = Math.max(0, limit - count);
    const reset = ttl > 0 ? Date.now() + ttl * 1000 : 0;

    return { remaining, reset };
  } catch (error) {
    console.error('Rate limit info error:', error);
    return { remaining: config.limit, reset: 0 };
  }
}
