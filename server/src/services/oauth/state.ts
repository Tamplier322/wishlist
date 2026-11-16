import { timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { verifyOAuthState, signOAuthState, type OAuthStatePayload } from '../../utils/jwt';
import { unauthorized } from '../../utils/errors';
import { sharedCache } from '../cache';
import { createNonce, createPkcePair } from './pkce';
import type { OAuthProvider } from '../../types/domain';

interface StoredState {
  provider: OAuthProvider;
  mode: 'login' | 'link';
  userId?: string;
  next?: string;
  codeVerifier: string;
}

export interface CreatedState {
  state: string;
  nonce: string;
  codeChallenge: string;
}

export const OAUTH_STATE_COOKIE = 'wl_oauth_nonce';

function stateKey(nonce: string): string {
  return `oauth:state:${nonce}`;
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function createOAuthState(input: {
  provider: OAuthProvider;
  mode: 'login' | 'link';
  userId?: string;
  next?: string;
}): Promise<CreatedState> {
  const nonce = createNonce();
  const pkce = createPkcePair();
  const ttlSec = Math.max(60, Math.floor(env.oauth.stateTtlMs / 1000));

  const state = signOAuthState(
    {
      provider: input.provider,
      mode: input.mode,
      userId: input.userId,
      next: input.next,
      nonce,
    },
    ttlSec,
  );

  const stored: StoredState = {
    provider: input.provider,
    mode: input.mode,
    userId: input.userId,
    next: input.next,
    codeVerifier: pkce.verifier,
  };
  await sharedCache.set(stateKey(nonce), stored, env.oauth.stateTtlMs);

  return { state, nonce, codeChallenge: pkce.challenge };
}

export async function consumeOAuthState(
  stateToken: string,
  cookieNonce: string | undefined,
): Promise<{ payload: OAuthStatePayload; stored: StoredState }> {
  let payload: OAuthStatePayload;
  try {
    payload = verifyOAuthState(stateToken);
  } catch {
    throw unauthorized('OAuth state недействителен или истёк');
  }

  if (!cookieNonce || !safeEqual(cookieNonce, payload.nonce)) {
    throw unauthorized('OAuth state не совпадает с текущей сессией');
  }

  const key = stateKey(payload.nonce);
  const stored = await sharedCache.get<StoredState>(key);
  await sharedCache.delete(key);
  if (!stored || stored.provider !== payload.provider || stored.mode !== payload.mode) {
    throw unauthorized('OAuth state уже использован');
  }

  return { payload, stored };
}

export function exchangeKey(code: string): string {
  return `oauth:exchange:${code}`;
}
