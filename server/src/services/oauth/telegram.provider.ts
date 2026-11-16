import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { HttpError, unauthorized } from '../../utils/errors';
import { sharedCache } from '../cache';
import type { OAuthProfile } from './types';

export interface TelegramAuthData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

function safeHexEqual(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
  maxAgeSec: number,
  nowMs = Date.now(),
): OAuthProfile {
  if (!botToken) throw unauthorized('Telegram-вход не настроен');
  if (!data.hash || !/^[0-9a-f]{64}$/i.test(data.hash)) {
    throw unauthorized('Некорректная подпись Telegram');
  }

  const checkString = Object.entries(data)
    .filter(([key]) => key !== 'hash' && data[key as keyof TelegramAuthData] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');

  const secret = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest('hex');

  if (!safeHexEqual(expected, data.hash)) {
    throw unauthorized('Подпись Telegram неверна');
  }

  const authDate = Number(data.auth_date);
  const nowSec = Math.floor(nowMs / 1000);
  if (!Number.isFinite(authDate) || authDate > nowSec + 300) {
    throw unauthorized('Некорректная дата Telegram-входа');
  }
  if (nowSec - authDate > maxAgeSec) {
    throw unauthorized('Telegram-вход устарел, попробуйте снова');
  }

  const id = String(data.id);
  if (!/^\d{1,20}$/.test(id)) throw unauthorized('Некорректный Telegram ID');

  const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  const avatarUrl =
    data.photo_url && /^https:\/\//.test(data.photo_url)
      ? data.photo_url
      : data.username
        ? `https://t.me/i/userpic/320/${encodeURIComponent(data.username)}.jpg`
        : null;
  return {
    provider: 'telegram',
    providerUserId: id,
    displayName: displayName || (data.username ? `@${data.username}` : `Telegram ${id}`),
    username: data.username,
    email: null,
    emailVerified: false,
    avatarUrl,
  };
}

export async function assertTelegramNotReplayed(hash: string): Promise<void> {
  const key = `oauth:telegram:${hash}`;
  const seen = await sharedCache.get<boolean>(key);
  if (seen) throw unauthorized('Этот Telegram-вход уже использован');
  await sharedCache.set(key, true, Math.max(60, env.oauth.telegram.maxAgeSec) * 1000);
}

export function telegramConfigured(): boolean {
  return env.oauth.telegram.botToken !== '' && env.oauth.telegram.botUsername !== '';
}

export function telegramError(message: string): HttpError {
  return new HttpError(502, message, undefined, 'OAUTH_PROVIDER_ERROR');
}
