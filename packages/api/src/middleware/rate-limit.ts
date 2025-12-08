import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { logger } from "@acme/logger";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 100,
  keyPrefix: "rl",
};

/**
 * Rate limiting middleware using Redis sliding window.
 * Per-org limits for authenticated requests, per-IP for anonymous.
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, keyPrefix } = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.user?.orgId || req.ip;
    const key = `${keyPrefix}:${identifier}`;

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Sliding window using sorted set
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const requestCount = results?.[2]?.[1] as number;

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - requestCount));
      res.setHeader("X-RateLimit-Reset", new Date(now + windowMs).toISOString());

      if (requestCount > maxRequests) {
        logger.warn({ identifier, requestCount, maxRequests }, "Rate limit exceeded");
        return res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (err) {
      // Fail open — don't block requests if Redis is down
      logger.error({ err }, "Rate limiter error — failing open");
      next();
    }
  };
}
