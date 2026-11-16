import { execRun, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { WishlistEvent, WishlistEventAction } from '../../types/domain';

interface EventRow {
  id: string;
  wishlist_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_id: string | null;
  title: string | null;
  detail: string | null;
  created_at: string;
}

export interface EventInput {
  wishlistId: string;
  actorId: string;
  actorName?: string;
  action: WishlistEventAction;
  targetId?: string | null;
  title?: string | null;
  detail?: string | null;
}

function toEvent(row: EventRow): WishlistEvent {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action as WishlistEventAction,
    targetId: row.target_id,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export async function addEvent(input: EventInput): Promise<WishlistEvent> {
  const event: WishlistEvent = {
    id: createId(),
    wishlistId: input.wishlistId,
    actorId: input.actorId,
    actorName: input.actorName ?? 'unknown',
    action: input.action,
    targetId: input.targetId ?? null,
    title: input.title ?? null,
    detail: input.detail ?? null,
    createdAt: new Date().toISOString(),
  };
  await execRun(
    `INSERT INTO events
      (id, wishlist_id, actor_id, actor_name, action, target_id, title, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.wishlistId,
      event.actorId,
      event.actorName,
      event.action,
      event.targetId,
      event.title,
      event.detail,
      event.createdAt,
    ],
  );
  return event;
}

export async function findEventsByWishlist(
  wishlistId: string,
  limit = 50,
): Promise<WishlistEvent[]> {
  const rows = await getRows<EventRow>(
    `SELECT * FROM events WHERE wishlist_id = ? ORDER BY created_at DESC LIMIT ?`,
    [wishlistId, limit],
  );
  return rows.map(toEvent);
}
