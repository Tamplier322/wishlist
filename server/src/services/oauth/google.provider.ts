import { createPublicKey, verify as verifySignature, type JsonWebKey } from 'node:crypto';
import { env } from '../../config/env';
import { HttpError } from '../../utils/errors';
import type { OAuthProfile, OAuthProviderAdapter } from './types';
import { callbackUrl } from './urls';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const SCOPES = 'openid email profile';

interface GoogleClaims {
  sub: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

function providerError(message: string): HttpError {
  return new HttpError(502, message, undefined, 'OAUTH_PROVIDER_ERROR');
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

async function loadGoogleKeys(force = false): Promise<Jwk[]> {
  if (!force && jwksCache && Date.now() - jwksCache.fetchedAt < 60 * 60 * 1000) {
    return jwksCache.keys;
  }
  const response = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw providerError('Не удалось получить ключи Google');
  const json = (await response.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(json.keys) ? json.keys : [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<GoogleClaims> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw providerError('Некорректный Google ID-token');
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeSegment<{ alg?: string; kid?: string }>(headerPart);
  if (header.alg !== 'RS256' || !header.kid) {
    throw providerError('Неподдерживаемый алгоритм Google ID-token');
  }

  const claims = decodeSegment<GoogleClaims>(payloadPart);
  const now = Math.floor(Date.now() / 1000);

  if (claims.aud !== env.oauth.google.clientId) {
    throw providerError('Google ID-token выдан другому приложению');
  }
  if (claims.iss !== 'accounts.google.com' && claims.iss !== 'https://accounts.google.com') {
    throw providerError('Неверный issuer Google ID-token');
  }
  if (!Number.isFinite(claims.exp) || claims.exp < now - 60) {
    throw providerError('Google ID-token истёк');
  }
  if (!Number.isFinite(claims.iat) || claims.iat > now + 60) {
    throw providerError('Google ID-token из будущего');
  }
  if (!claims.nonce || claims.nonce !== expectedNonce) {
    throw providerError('Google ID-token не совпадает с запросом');
  }
  if (!claims.sub) throw providerError('Google не вернул идентификатор пользователя');

  let keys = await loadGoogleKeys();
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    keys = await loadGoogleKeys(true);
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) throw providerError('Ключ Google ID-token не найден');

  const publicKey = createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' });
  const valid = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${headerPart}.${payloadPart}`),
    publicKey,
    Buffer.from(signaturePart, 'base64url'),
  );
  if (!valid) throw providerError('Подпись Google ID-token неверна');

  return claims;
}

export const googleProvider: OAuthProviderAdapter = {
  id: 'google',

  isConfigured(): boolean {
    return env.oauth.google.clientId !== '' && env.oauth.google.clientSecret !== '';
  },

  buildAuthUrl({ state, codeChallenge, nonce }): string {
    const params = new URLSearchParams({
      client_id: env.oauth.google.clientId,
      redirect_uri: callbackUrl('google'),
      response_type: 'code',
      scope: SCOPES,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchange({ code, codeVerifier, nonce }): Promise<OAuthProfile> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.oauth.google.clientId,
        client_secret: env.oauth.google.clientSecret,
        redirect_uri: callbackUrl('google'),
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw providerError('Google отклонил обмен кода');

    const json = (await response.json()) as { id_token?: string };
    if (!json.id_token) throw providerError('Google не вернул ID-token');

    const claims = await verifyGoogleIdToken(json.id_token, nonce);
    return {
      provider: 'google',
      providerUserId: claims.sub,
      displayName: claims.name?.trim() || claims.email || 'Google user',
      email: claims.email ?? null,
      emailVerified: claims.email_verified === true,
      avatarUrl: claims.picture ?? null,
    };
  },
};
