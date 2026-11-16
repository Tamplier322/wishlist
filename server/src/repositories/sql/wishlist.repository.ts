import { execRun, getRow, getRows } from '../../config/database';
import { createId, createSlug } from '../../utils/ids';
import type { Wishlist } from '../../types/domain';

interface WishlistRow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  is_shared: number;
  share_slug: string | null;
  invite_code: string | null;
  deadline: string | null;
  surprise_mode: number;
  workspace_id: string | null;
  created_at: string;
}

function toWishlist(row: WishlistRow): Wishlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    isShared: row.is_shared === 1,
    shareSlug: row.share_slug,
    inviteCode: row.invite_code,
    deadline: row.deadline,
    surpriseMode: row.surprise_mode === 1,
    workspaceId: row.workspace_id,
    createdAt: row.created_at,
  };
}

const COLUMNS =
  'id, owner_id, name, description, is_shared, share_slug, invite_code, deadline, surprise_mode, workspace_id, created_at';

export async function createWishlist(input: {
  ownerId: string;
  name: string;
  description?: string;
  workspaceId?: string | null;
}): Promise<Wishlist> {
  const id = createId();
  const now = new Date().toISOString();
  await execRun(
    `INSERT INTO wishlists (id, owner_id, name, description, is_shared, share_slug, invite_code, deadline, surprise_mode, workspace_id, created_at)
     VALUES (?, ?, ?, ?, 0, NULL, ?, NULL, 0, ?, ?)`,
    [id, input.ownerId, input.name, input.description ?? '', createSlug(), input.workspaceId ?? null, now],
  );
  const wishlist = await findWishlistById(id);
  if (!wishlist) throw new Error('Failed to create wishlist');
  return wishlist;
}

export async function findWishlistById(id: string): Promise<Wishlist | null> {
  const row = await getRow<WishlistRow>(`SELECT ${COLUMNS} FROM wishlists WHERE id = ?`, [id]);
  return row ? toWishlist(row) : null;
}

export async function findWishlistBySlug(slug: string): Promise<Wishlist | null> {
  const row = await getRow<WishlistRow>(
    `SELECT ${COLUMNS} FROM wishlists WHERE share_slug = ? AND is_shared = 1`,
    [slug],
  );
  return row ? toWishlist(row) : null;
}

export async function findWishlistByInviteCode(code: string): Promise<Wishlist | null> {
  const row = await getRow<WishlistRow>(
    `SELECT ${COLUMNS} FROM wishlists WHERE invite_code = ?`,
    [code],
  );
  return row ? toWishlist(row) : null;
}


export async function findWishlistsByUser(userId: string): Promise<Wishlist[]> {
  const rows = await getRows<WishlistRow>(
    `SELECT DISTINCT w.id, w.owner_id, w.name, w.description, w.is_shared,
            w.share_slug, w.invite_code, w.created_at
     FROM wishlists w
     LEFT JOIN wishlist_members m ON m.wishlist_id = w.id
     WHERE w.owner_id = ? OR m.user_id = ?
     ORDER BY w.created_at`,
    [userId, userId],
  );
  return rows.map(toWishlist);
}

export async function updateWishlist(
  id: string,
  patch: {
    name?: string;
    description?: string;
    deadline?: string | null;
    surpriseMode?: boolean;
  },
  existing?: Wishlist,
): Promise<Wishlist | null> {
  const current = existing ?? (await findWishlistById(id));
  if (!current) return null;
  const name = patch.name ?? current.name;
  const description = patch.description ?? current.description;
  const deadline = patch.deadline !== undefined ? patch.deadline : current.deadline;
  const surpriseMode =
    patch.surpriseMode !== undefined ? patch.surpriseMode : current.surpriseMode;
  await execRun(
    `UPDATE wishlists SET name = ?, description = ?, deadline = ?, surprise_mode = ? WHERE id = ?`,
    [name, description, deadline, surpriseMode ? 1 : 0, id],
  );
  return { ...current, name, description, deadline, surpriseMode };
}


export async function setShared(
  id: string,
  isShared: boolean,
  existing?: Wishlist,
): Promise<Wishlist | null> {
  const current = existing ?? (await findWishlistById(id));
  if (!current) return null;
  const shareSlug = isShared ? (current.shareSlug ?? createSlug()) : current.shareSlug;
  await execRun(`UPDATE wishlists SET is_shared = ?, share_slug = ? WHERE id = ?`, [
    isShared ? 1 : 0,
    shareSlug,
    id,
  ]);
  return { ...current, isShared, shareSlug };
}

export async function deleteWishlist(id: string): Promise<boolean> {
  await execRun(`DELETE FROM wishlists WHERE id = ?`, [id]);
  return true;
}

export interface ItemsStats {
  total: number;
  purchased: number;
}


export async function findItemsStats(wishlistIds: readonly string[]): Promise<Map<string, ItemsStats>> {
  const map = new Map<string, ItemsStats>();
  if (wishlistIds.length === 0) return map;

  const placeholders = wishlistIds.map(() => '?').join(',');
  const rows = await getRows<{ wishlist_id: string; total: number; purchased: number | null }>(
    `SELECT wishlist_id,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END) AS purchased
     FROM items
     WHERE wishlist_id IN (${placeholders})
     GROUP BY wishlist_id`,
    [...wishlistIds],
  );
  rows.forEach((row) => {
    map.set(row.wishlist_id, { total: Number(row.total), purchased: Number(row.purchased ?? 0) });
  });
  return map;
}
