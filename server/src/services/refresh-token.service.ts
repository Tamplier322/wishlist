import crypto from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  createRefreshToken,
  deleteExpiredRefreshTokens,
  deleteUserRefreshTokens,
  findRefreshToken,
  revokeRefreshTokenRecord,
} from '../repositories/refresh-token.repository';
import { unauthorized } from '../utils/errors';
import { recordAuthEventForUser } from './auth-audit.service';

const TOKEN_BYTES = 48;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function nextExpiryIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + env.jwtRefreshDays);
  return date.toISOString();
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  await createRefreshToken({
    tokenHash: hashToken(raw),
    userId,
    expiresAt: nextExpiryIso(),
  });
  return raw;
}

export async function consumeRefreshToken(
  raw: string,
): Promise<{ userId: string; refreshToken: string }> {
  const tokenHash = hashToken(raw);
  const record = await findRefreshToken(tokenHash);
  if (!record) throw unauthorized('Сессия истекла, войдите заново');

  if (record.revokedAt) {
    await deleteUserRefreshTokens(record.userId);
    recordAuthEventForUser(record.userId, 'token_reuse');
    logger.warn(
      { userId: record.userId },
      'Обнаружено повторное использование refresh-токена — все сессии отозваны',
    );
    throw unauthorized('Сессия отозвана из соображений безопасности, войдите заново');
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    await revokeRefreshTokenRecord(tokenHash);
    throw unauthorized('Сессия истекла, войдите заново');
  }

  await revokeRefreshTokenRecord(tokenHash);
  const refreshToken = await issueRefreshToken(record.userId);
  return { userId: record.userId, refreshToken };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await revokeRefreshTokenRecord(hashToken(raw));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await deleteUserRefreshTokens(userId);
}

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await deleteExpiredRefreshTokens(new Date().toISOString());
  } catch (error) {
    console.warn('Не удалось очистить истёкшие refresh-токены:', error);
  }
}
