import { EventEmitter } from 'node:events';

export interface WishlistChange {
  wishlistId: string;

  actorId: string;

  reason: 'item-added' | 'item-updated' | 'item-removed' | 'wishlist-updated' | 'member-removed' | 'category-changed';

  detail?: string;

  status?: 'wanted' | 'reserved' | 'purchased';
}


class WishlistEvents extends EventEmitter {}

export const wishlistEvents = new WishlistEvents();

wishlistEvents.setMaxListeners(50);

export function emitWishlistChange(change: WishlistChange): void {
  wishlistEvents.emit('change', change);
}
