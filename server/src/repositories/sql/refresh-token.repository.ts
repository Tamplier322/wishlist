import { execRun, getRow } from '../../config/database';

export interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

interface RefreshTokenRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

function toRecord(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    tokenHash: row.token_hash,
    userId: row.user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null,
  };
}

export async function createRefreshToken(input: {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}): Promise<void> {
  await execRun(
    `INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    [input.tokenHash, input.userId, input.expiresAt, new Date().toISOString()],
  );
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
  const row = await getRow<RefreshTokenRow>(
    `SELECT token_hash, user_id, expires_at, created_at, revoked_at
     FROM refresh_tokens WHERE token_hash = ?`,
    [tokenHash],
  );
  return row ? toRecord(row) : null;
}

export async function revokeRefreshTokenRecord(tokenHash: string): Promise<void> {
  await execRun(`UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`, [
    new Date().toISOString(),
    tokenHash,
  ]);
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await execRun(`DELETE FROM refresh_tokens WHERE token_hash = ?`, [tokenHash]);
}

export async function deleteUserRefreshTokens(userId: string): Promise<void> {
  await execRun(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);
}

export async function deleteExpiredRefreshTokens(nowIso: string): Promise<void> {
  await execRun(`DELETE FROM refresh_tokens WHERE expires_at <= ?`, [nowIso]);
}
