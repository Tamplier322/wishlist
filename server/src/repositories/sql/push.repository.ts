import { execRun, getRows } from '../../config/database';
import { createId } from '../../utils/ids';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface PushSubscriptionInput {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function upsertSubscription(input: PushSubscriptionInput): Promise<void> {
  const existing = await getRows<PushSubscriptionRow>(
    `SELECT id FROM push_subscriptions WHERE endpoint = ?`,
    [input.endpoint],
  );
  if (existing.length > 0) {
    await execRun(
      `UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE endpoint = ?`,
      [input.userId, input.p256dh, input.auth, input.endpoint],
    );
    return;
  }
  await execRun(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [createId(), input.userId, input.endpoint, input.p256dh, input.auth, new Date().toISOString()],
  );
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await execRun(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [endpoint]);
}

export async function findSubscriptionsByUsers(userIds: readonly string[]): Promise<
  Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>
> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return getRows<{ endpoint: string; p256dh: string; auth: string; user_id: string }>(
    `SELECT endpoint, p256dh, auth, user_id FROM push_subscriptions WHERE user_id IN (${placeholders})`,
    [...userIds],
  );
}
