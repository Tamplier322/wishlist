import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../utils/errors';
import { verifyToken } from '../utils/jwt';

function extractToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}


export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    next(unauthorized());
    return;
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    next(unauthorized('Сессия истекла, войдите заново'));
  }
}
