import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { OAuthAccount, OAuthProvider } from '../../types/domain';

interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthAccountInput {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function toAccount(row: OAuthAccountRow): OAuthAccount {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as OAuthProvider,
    providerUserId: row.provider_user_id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createOAuthAccount(input: OAuthAccountInput): Promise<OAuthAccount> {
  const id = createId();
  const now = new Date().toISOString();
  await execRun(
    `INSERT INTO oauth_accounts
      (id, user_id, provider, provider_user_id, email, display_name, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.provider,
      input.providerUserId,
      input.email ?? null,
      input.displayName ?? null,
      input.avatarUrl ?? null,
      now,
      now,
    ],
  );
  return {
    id,
    userId: input.userId,
    provider: input.provider,
    providerUserId: input.providerUserId,
    email: input.email ?? null,
    displayName: input.displayName ?? null,
    avatarUrl: input.avatarUrl ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function findOAuthAccount(
  provider: OAuthProvider,
  providerUserId: string,
): Promise<OAuthAccount | null> {
  const row = await getRow<OAuthAccountRow>(
    `SELECT * FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`,
    [provider, providerUserId],
  );
  return row ? toAccount(row) : null;
}

export async function findOAuthAccountsByUser(userId: string): Promise<OAuthAccount[]> {
  const rows = await getRows<OAuthAccountRow>(
    `SELECT * FROM oauth_accounts WHERE user_id = ? ORDER BY created_at`,
    [userId],
  );
  return rows.map(toAccount);
}

export async function updateOAuthAccountProfile(
  id: string,
  patch: { email?: string | null; displayName?: string | null; avatarUrl?: string | null },
): Promise<void> {
  const current = await getRow<OAuthAccountRow>(`SELECT * FROM oauth_accounts WHERE id = ?`, [id]);
  if (!current) return;
  await execRun(
    `UPDATE oauth_accounts
        SET email = ?, display_name = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?`,
    [
      patch.email !== undefined ? patch.email : current.email,
      patch.displayName !== undefined ? patch.displayName : current.display_name,
      patch.avatarUrl !== undefined ? patch.avatarUrl : current.avatar_url,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function deleteOAuthAccount(userId: string, provider: OAuthProvider): Promise<boolean> {
  const existing = await getRow<{ id: string }>(
    `SELECT id FROM oauth_accounts WHERE user_id = ? AND provider = ?`,
    [userId, provider],
  );
  if (!existing) return false;
  await execRun(`DELETE FROM oauth_accounts WHERE id = ?`, [existing.id]);
  return true;
}
