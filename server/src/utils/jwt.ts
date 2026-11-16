import jwt, { type Algorithm, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { OAuthProvider } from '../types/domain';

export interface JwtPayload {
  sub: string;
  username: string;
  typ?: 'access' | 'refresh';
}

export interface OAuthStatePayload {
  provider: OAuthProvider;
  mode: 'login' | 'link';
  userId?: string;
  next?: string;
  nonce: string;
  typ: 'oauth-state';
}

const ISSUER = 'wishlist';
const ACCESS_AUDIENCE = 'wishlist-client';
const OAUTH_STATE_AUDIENCE = 'wishlist-oauth-state';

const COMMON_VERIFY = {
  algorithms: ['HS256'] as Algorithm[],
  issuer: ISSUER,
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, typ: 'access' }, env.jwtSecret, {
    expiresIn: env.jwtAccessExpiresIn,
    algorithm: 'HS256',
    issuer: ISSUER,
    audience: ACCESS_AUDIENCE,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret, {
    ...COMMON_VERIFY,
    audience: ACCESS_AUDIENCE,
  });
  if (typeof decoded !== 'object' || decoded === null) throw new Error('Invalid token payload');
  const payload = decoded as JwtPayload;
  if (payload.typ !== 'access' || typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Invalid token type');
  }
  return payload;
}

export function signOAuthState(payload: Omit<OAuthStatePayload, 'typ'>, ttlSec: number): string {
  return jwt.sign({ ...payload, typ: 'oauth-state' }, env.jwtSecret, {
    expiresIn: ttlSec,
    algorithm: 'HS256',
    issuer: ISSUER,
    audience: OAUTH_STATE_AUDIENCE,
  } as SignOptions);
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  const decoded = jwt.verify(token, env.jwtSecret, {
    ...COMMON_VERIFY,
    audience: OAUTH_STATE_AUDIENCE,
  });
  if (typeof decoded !== 'object' || decoded === null) throw new Error('Invalid state payload');
  const payload = decoded as OAuthStatePayload;
  if (payload.typ !== 'oauth-state' || typeof payload.nonce !== 'string' || !payload.nonce) {
    throw new Error('Invalid state type');
  }
  return payload;
}
