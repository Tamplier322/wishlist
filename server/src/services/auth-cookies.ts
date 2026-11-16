import type { Request, Response } from 'express';
import { env, isProduction } from '../config/env';

export const REFRESH_COOKIE = 'wl_refresh';
const COOKIE_PATH = '/api/auth';

function cookieFlags(value: string, maxAgeSec: number): string {
  const flags = [
    `${REFRESH_COOKIE}=${encodeURIComponent(value)}`,
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isProduction) flags.push('Secure');
  return flags.join('; ');
}

export function setRefreshCookie(res: Response, token: string): void {
  res.append('Set-Cookie', cookieFlags(token, env.jwtRefreshDays * 24 * 60 * 60));
}

export function clearRefreshCookie(res: Response): void {
  const flags = [
    `${REFRESH_COOKIE}=`,
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ];
  if (isProduction) flags.push('Secure');
  res.append('Set-Cookie', flags.join('; '));
}

export function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === REFRESH_COOKIE) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

export function withoutRefreshToken<T extends { refreshToken?: string }>(
  result: T,
): Omit<T, 'refreshToken'> {
  const { refreshToken: _refreshToken, ...rest } = result;
  return rest;
}
