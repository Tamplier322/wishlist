import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { Invite, InviteStatus } from '../../types/domain';

interface InviteRow {
  id: string;
  wishlist_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  wishlist_name: string;
  from_username: string;
}

function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status as InviteStatus,
    createdAt: row.created_at,
    wishlistName: row.wishlist_name,
    fromUsername: row.from_username,
  };
}

const SELECT = `
  SELECT i.id, i.wishlist_id, i.from_user_id, i.to_user_id, i.status, i.created_at,
         w.name AS wishlist_name, u.username AS from_username
  FROM invites i
  JOIN wishlists w ON w.id = i.wishlist_id
  JOIN users u ON u.id = i.from_user_id
`;

export async function createInvite(input: {
  wishlistId: string;
  fromUserId: string;
  toUserId: string;
}): Promise<Invite> {
  const id = createId();
  const now = new Date().toISOString();
  await execRun(
    `INSERT INTO invites (id, wishlist_id, from_user_id, to_user_id, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, input.wishlistId, input.fromUserId, input.toUserId, now],
  );
  const invite = await findInviteById(id);
  if (!invite) throw new Error('Failed to create invite');
  return invite;
}

export async function findInviteById(id: string): Promise<Invite | null> {
  const row = await getRow<InviteRow>(`${SELECT} WHERE i.id = ?`, [id]);
  return row ? toInvite(row) : null;
}


export async function findPendingInvite(wishlistId: string, toUserId: string): Promise<Invite | null> {
  const row = await getRow<InviteRow>(
    `${SELECT} WHERE i.wishlist_id = ? AND i.to_user_id = ? AND i.status = 'pending'`,
    [wishlistId, toUserId],
  );
  return row ? toInvite(row) : null;
}

export async function findIncomingInvites(userId: string): Promise<Invite[]> {
  const rows = await getRows<InviteRow>(
    `${SELECT} WHERE i.to_user_id = ? AND i.status = 'pending' ORDER BY i.created_at DESC`,
    [userId],
  );
  return rows.map(toInvite);
}

export async function updateInviteStatus(id: string, status: InviteStatus): Promise<Invite | null> {
  await execRun(`UPDATE invites SET status = ? WHERE id = ?`, [status, id]);
  return findInviteById(id);
}
