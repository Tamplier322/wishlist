import { EventEmitter } from 'node:events';

export interface WishlistChange {
  id?: number;
  wishlistId: string;

  actorId: string;

  reason:
    | 'item-added'
    | 'item-updated'
    | 'item-removed'
    | 'wishlist-updated'
    | 'member-removed'
    | 'category-changed'
    | 'comment-added';

  detail?: string;

  status?: 'wanted' | 'reserved' | 'purchased';

  at?: string;
}

const HISTORY_LIMIT = 100;

const history = new Map<string, WishlistChange[]>();
let nextId = 1;

class WishlistEvents extends EventEmitter {}

export const wishlistEvents = new WishlistEvents();

wishlistEvents.setMaxListeners(50);

export function emitWishlistChange(change: WishlistChange): void {
  const enriched: WishlistChange = {
    ...change,
    id: nextId,
    at: new Date().toISOString(),
  };
  nextId += 1;

  const list = history.get(change.wishlistId) ?? [];
  list.push(enriched);
  if (list.length > HISTORY_LIMIT) list.splice(0, list.length - HISTORY_LIMIT);
  history.set(change.wishlistId, list);

  wishlistEvents.emit('change', enriched);
}

export function changesSince(wishlistId: string, lastEventId: number): WishlistChange[] {
  const list = history.get(wishlistId) ?? [];
  return list.filter((change) => (change.id ?? 0) > lastEventId);
}
