import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/errors';

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(limit: number, windowMs: number, name = 'default') {
  const buckets = new Map<string, Bucket>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    if (process.env.RATE_LIMIT_DISABLED === '1') {
      next();
      return;
    }

    const identity = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`;
    const key = `${name}:${identity}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      if (buckets.size > 5000) {
        buckets.forEach((value, bucketKey) => {
          if (value.resetAt <= now) buckets.delete(bucketKey);
        });
      }
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      next(new HttpError(429, `Слишком много запросов. Повторите через ${retryAfterSec} с`, undefined, 'RATE_LIMITED'));
      return;
    }
    next();
  };
}
