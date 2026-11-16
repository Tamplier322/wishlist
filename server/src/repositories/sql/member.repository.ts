import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { MemberRole, PublicUser, WishlistMember } from '../../types/domain';

interface MemberRow {
  id: string;
  wishlist_id: string;
  user_id: string;
  color: string;
  role: string;
  joined_at: string;
  username: string;
  avatar_color: string;
}

function toMember(row: MemberRow): WishlistMember {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    userId: row.user_id,
    color: row.color,
    role: row.role as MemberRole,
    joinedAt: row.joined_at,
    user: { id: row.user_id, username: row.username, avatarColor: row.avatar_color },
  };
}

const SELECT = `
  SELECT m.id, m.wishlist_id, m.user_id, m.color, m.role, m.joined_at,
         u.username, u.avatar_color
  FROM wishlist_members m
  JOIN users u ON u.id = m.user_id
`;

export async function addMember(
  input: {
    wishlistId: string;
    userId: string;
    color: string;
    role: MemberRole;
  },
  _knownUser?: PublicUser,
): Promise<WishlistMember | null> {
  const existing = await findMember(input.wishlistId, input.userId);
  if (existing) return existing;
  await execRun(
    `INSERT INTO wishlist_members (id, wishlist_id, user_id, color, role, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [createId(), input.wishlistId, input.userId, input.color, input.role, new Date().toISOString()],
  );
  return findMember(input.wishlistId, input.userId);
}

export async function updateMemberRole(
  wishlistId: string,
  userId: string,
  role: MemberRole,
): Promise<void> {
  await execRun(`UPDATE wishlist_members SET role = ? WHERE wishlist_id = ? AND user_id = ?`, [
    role,
    wishlistId,
    userId,
  ]);
}

export async function findMember(wishlistId: string, userId: string): Promise<WishlistMember | null> {
  const row = await getRow<MemberRow>(`${SELECT} WHERE m.wishlist_id = ? AND m.user_id = ?`, [
    wishlistId,
    userId,
  ]);
  return row ? toMember(row) : null;
}

export async function findMembersByWishlist(wishlistId: string): Promise<WishlistMember[]> {
  const rows = await getRows<MemberRow>(`${SELECT} WHERE m.wishlist_id = ? ORDER BY m.joined_at`, [
    wishlistId,
  ]);
  return rows.map(toMember);
}

export async function countMembers(wishlistId: string): Promise<number> {
  const row = await getRow<{ count: number }>(
    'SELECT COUNT(*) AS count FROM wishlist_members WHERE wishlist_id = ?',
    [wishlistId],
  );
  return Number(row?.count ?? 0);
}

export async function findTakenColors(wishlistId: string): Promise<string[]> {
  const rows = await getRows<{ color: string }>(
    'SELECT color FROM wishlist_members WHERE wishlist_id = ?',
    [wishlistId],
  );
  return rows.map((row) => row.color);
}

export async function deleteMember(wishlistId: string, userId: string): Promise<boolean> {
  await execRun(`DELETE FROM wishlist_members WHERE wishlist_id = ? AND user_id = ?`, [
    wishlistId,
    userId,
  ]);
  return true;
}
