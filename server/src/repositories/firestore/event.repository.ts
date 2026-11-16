import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import type { WishlistEvent, WishlistEventAction } from '../../types/domain';

export interface EventInput {
  wishlistId: string;
  actorId: string;
  actorName?: string;
  action: WishlistEventAction;
  targetId?: string | null;
  title?: string | null;
  detail?: string | null;
}

interface EventDoc {
  wishlistId: string;
  actorId: string;
  actorName: string;
  action: WishlistEventAction;
  targetId: string | null;
  title: string | null;
  detail: string | null;
  createdAt: string;
}

export async function addEvent(input: EventInput): Promise<WishlistEvent> {
  const id = createId();
  const doc: EventDoc = {
    wishlistId: input.wishlistId,
    actorId: input.actorId,
    actorName: input.actorName ?? 'unknown',
    action: input.action,
    targetId: input.targetId ?? null,
    title: input.title ?? null,
    detail: input.detail ?? null,
    createdAt: new Date().toISOString(),
  };
  await firestore().collection(COLLECTIONS.events).doc(id).set(doc);
  return { id, ...doc };
}

export async function findEventsByWishlist(
  wishlistId: string,
  limit = 50,
): Promise<WishlistEvent[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.events)
    .where('wishlistId', '==', wishlistId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as EventDoc) }));
}
