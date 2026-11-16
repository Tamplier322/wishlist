import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { findUserById } from '../repositories/user.repository';
import { setRefreshCookie, withoutRefreshToken } from '../services/auth-cookies';
import { sharedCache } from '../services/cache';
import {
  isOAuthProvider,
  isProviderConfigured,
  providerAvailability,
  redirectProviders,
} from '../services/oauth';
import { buildCookie, clearCookie, readCookie } from '../services/oauth/cookies';
import {
  consumeOAuthState,
  createOAuthState,
  exchangeKey,
  OAUTH_STATE_COOKIE,
} from '../services/oauth/state';
import { assertTelegramNotReplayed, verifyTelegramAuth } from '../services/oauth/telegram.provider';
import {
  linkOAuthAccount,
  listOAuthAccounts,
  loginWithOAuth,
  unlinkOAuthAccount,
} from '../services/oauth.service';
import type { AuthResult } from '../services/auth.service';
import { recordAuthEvent } from '../services/auth-audit.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { HttpError, badRequest, unauthorized } from '../utils/errors';
import { oauthExchangeSchema, telegramAuthSchema } from '../utils/validators';
import type { OAuthProvider } from '../types/domain';

function sanitizeNext(value: unknown): string {
  if (typeof value !== 'string') return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/api')) {
    return '/dashboard';
  }
  return value.slice(0, 300);
}

function requireRedirectProvider(value: string): 'google' {
  if (value !== 'google') {
    throw badRequest('Этот сервис не поддерживает вход по redirect');
  }
  if (!isProviderConfigured(value)) {
    throw badRequest('Вход через этот сервис не настроен на сервере');
  }
  return value;
}

function redirectWithError(res: Response, code: string): void {
  res.redirect(302, `${env.appUrl}/oauth/callback?error=${encodeURIComponent(code)}`);
}

export const oauthProvidersHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(providerAvailability());
});

export const startOAuthHandler = asyncHandler(async (req: Request, res: Response) => {
  const provider = requireRedirectProvider(req.params.provider);
  const next = sanitizeNext(req.query.next);
  const { state, nonce, codeChallenge } = await createOAuthState({
    provider,
    mode: 'login',
    next,
  });
  const url = redirectProviders[provider].buildAuthUrl({ state, codeChallenge, nonce });
  res.setHeader(
    'Set-Cookie',
    buildCookie(OAUTH_STATE_COOKIE, nonce, Math.floor(env.oauth.stateTtlMs / 1000)),
  );
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, url);
});

export const linkOAuthStartHandler = asyncHandler(async (req: Request, res: Response) => {
  const provider = requireRedirectProvider(req.params.provider);
  const { state, nonce, codeChallenge } = await createOAuthState({
    provider,
    mode: 'link',
    userId: req.user!.id,
    next: '/profile',
  });
  const url = redirectProviders[provider].buildAuthUrl({ state, codeChallenge, nonce });
  res.setHeader(
    'Set-Cookie',
    buildCookie(OAUTH_STATE_COOKIE, nonce, Math.floor(env.oauth.stateTtlMs / 1000)),
  );
  res.setHeader('Cache-Control', 'no-store');
  res.json({ url });
});

export const oauthCallbackHandler = asyncHandler(async (req: Request, res: Response) => {
  const providerParam = req.params.provider;
  res.setHeader('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE));

  try {
    const provider = requireRedirectProvider(providerParam);
    const stateToken = String(req.query.state ?? '');
    if (!stateToken) throw unauthorized('Отсутствует OAuth state');

    const cookieNonce = readCookie(req.headers.cookie, OAUTH_STATE_COOKIE);
    const { payload, stored } = await consumeOAuthState(stateToken, cookieNonce);
    if (payload.provider !== provider) throw unauthorized('OAuth state от другого сервиса');

    if (req.query.error) throw unauthorized('Провайдер отклонил вход');

    const code = String(req.query.code ?? '');
    if (!code) throw unauthorized('Провайдер не вернул код авторизации');

    const profile = await redirectProviders[provider].exchange({
      code,
      codeVerifier: stored.codeVerifier,
      nonce: payload.nonce,
    });

    if (payload.mode === 'link') {
      if (!payload.userId) throw unauthorized('Нет пользователя для привязки');
      await linkOAuthAccount(payload.userId, profile);
      res.redirect(302, `${env.appUrl}/oauth/callback?status=linked&provider=${provider}`);
      return;
    }

    const result = await loginWithOAuth(profile);
    recordAuthEvent(req, 'oauth_login', result.user.id);
    const exchangeCode = randomBytes(24).toString('base64url');
    await sharedCache.set(exchangeKey(exchangeCode), result, env.oauth.exchangeTtlMs);

    const params = new URLSearchParams({
      code: exchangeCode,
      next: sanitizeNext(payload.next),
    });
    res.redirect(302, `${env.appUrl}/oauth/callback?${params.toString()}`);
  } catch (error) {
    const code = error instanceof HttpError ? error.code : 'OAUTH_FAILED';
    logger.warn({ err: error, provider: providerParam }, 'OAuth callback failed');
    redirectWithError(res, code);
  }
});

export const exchangeOAuthHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(oauthExchangeSchema, req.body);
  const key = exchangeKey(body.code);
  const result = await sharedCache.get<AuthResult>(key);
  await sharedCache.delete(key);
  if (!result) throw unauthorized('Код входа истёк, попробуйте снова');
  setRefreshCookie(res, result.refreshToken);
  res.setHeader('Cache-Control', 'no-store');
  res.json(withoutRefreshToken(result));
});

export const telegramLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!isProviderConfigured('telegram')) throw badRequest('Telegram-вход не настроен');
  const body = parseBody(telegramAuthSchema, req.body);
  const profile = verifyTelegramAuth(
    body,
    env.oauth.telegram.botToken,
    env.oauth.telegram.maxAgeSec,
  );
  await assertTelegramNotReplayed(body.hash);
  const result = await loginWithOAuth(profile);
  recordAuthEvent(req, 'oauth_login', result.user.id);
  setRefreshCookie(res, result.refreshToken);
  res.setHeader('Cache-Control', 'no-store');
  res.json(withoutRefreshToken(result));
});

export const telegramLinkHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!isProviderConfigured('telegram')) throw badRequest('Telegram-вход не настроен');
  const body = parseBody(telegramAuthSchema, req.body);
  const profile = verifyTelegramAuth(
    body,
    env.oauth.telegram.botToken,
    env.oauth.telegram.maxAgeSec,
  );
  await assertTelegramNotReplayed(body.hash);
  const user = await linkOAuthAccount(req.user!.id, profile);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, user });
});

export const oauthAccountsHandler = asyncHandler(async (req: Request, res: Response) => {
  const [accounts, user] = await Promise.all([
    listOAuthAccounts(req.user!.id),
    findUserById(req.user!.id),
  ]);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    accounts: accounts.map((account) => ({
      provider: account.provider,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      email: account.email,
      createdAt: account.createdAt,
    })),
    hasPassword: user?.hasPassword ?? true,
    available: providerAvailability(),
  });
});

export const unlinkOAuthHandler = asyncHandler(async (req: Request, res: Response) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider)) throw badRequest('Неизвестный сервис');
  await unlinkOAuthAccount(req.user!.id, provider as OAuthProvider);
  res.status(204).end();
});
