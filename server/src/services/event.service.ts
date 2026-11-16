import {
  addEvent,
  findEventsByWishlist,
  type EventInput,
} from '../repositories/event.repository';
import { findUserById } from '../repositories/user.repository';
import type { WishlistEvent } from '../types/domain';
import { getAccessibleWishlist } from './wishlist.service';

export async function logEvent(input: EventInput): Promise<void> {
  try {
    const actor = await findUserById(input.actorId);
    await addEvent({ ...input, actorName: actor?.username ?? 'unknown' });
  } catch {
    void 0;
  }
}

export async function listEvents(
  wishlistId: string,
  userId: string,
  limit = 50,
): Promise<WishlistEvent[]> {
  await getAccessibleWishlist(wishlistId, userId);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 200) : 50;
  return findEventsByWishlist(wishlistId, safeLimit);
}
