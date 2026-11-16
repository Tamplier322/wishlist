import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/errors';

interface Bucket {
  count: number;
  resetAt: number;
}


export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function rateLimiter(req: Request, _res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      next(new HttpError(429, `Слишком много запросов. Повторите через ${retryAfterSec} с`));
      return;
    }
    next();
  };
}
