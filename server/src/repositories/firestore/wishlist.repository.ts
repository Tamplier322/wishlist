import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId, createSlug } from '../../utils/ids';
import { chunk } from './helpers';
import type { Wishlist } from '../../types/domain';

interface WishlistDoc {
  ownerId: string;
  name: string;
  description: string;
  isShared: boolean;
  shareSlug: string | null;
  inviteCode: string | null;
  deadline: string | null;
  workspaceId: string | null;
  memberIds: string[];
  createdAt: string;
}

function toWishlist(id: string, data: WishlistDoc): Wishlist {
  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    description: data.description ?? '',
    isShared: data.isShared === true,
    shareSlug: data.shareSlug ?? null,
    inviteCode: data.inviteCode ?? null,
    deadline: data.deadline ?? null,
    workspaceId: data.workspaceId ?? null,
    createdAt: data.createdAt,
  };
}

export async function createWishlist(input: {
  ownerId: string;
  name: string;
  description?: string;
  workspaceId?: string | null;
}): Promise<Wishlist> {
  const id = createId();
  const now = new Date().toISOString();
  const doc: WishlistDoc = {
    ownerId: input.ownerId,
    name: input.name,
    description: input.description ?? '',
    isShared: false,
    shareSlug: null,
    inviteCode: createSlug(),
    deadline: null,
    workspaceId: input.workspaceId ?? null,
    memberIds: [],
    createdAt: now,
  };
  await firestore().collection(COLLECTIONS.wishlists).doc(id).set(doc);
  return toWishlist(id, doc);
}

export async function findWishlistById(id: string): Promise<Wishlist | null> {
  const snapshot = await firestore().collection(COLLECTIONS.wishlists).doc(id).get();
  if (!snapshot.exists) return null;
  return toWishlist(id, snapshot.data() as WishlistDoc);
}

export async function findWishlistBySlug(slug: string): Promise<Wishlist | null> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.wishlists)
    .where('shareSlug', '==', slug)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const wishlist = toWishlist(doc.id, doc.data() as WishlistDoc);
  return wishlist.isShared ? wishlist : null;
}

export async function findWishlistByInviteCode(code: string): Promise<Wishlist | null> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.wishlists)
    .where('inviteCode', '==', code)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return toWishlist(doc.id, doc.data() as WishlistDoc);
}

export async function findWishlistsByUser(userId: string): Promise<Wishlist[]> {
  const db = firestore();
  const [owned, shared] = await Promise.all([
    db.collection(COLLECTIONS.wishlists).where('ownerId', '==', userId).get(),
    db.collection(COLLECTIONS.wishlists).where('memberIds', 'array-contains', userId).get(),
  ]);

  const map = new Map<string, Wishlist>();
  [...owned.docs, ...shared.docs].forEach((doc) => {
    map.set(doc.id, toWishlist(doc.id, doc.data() as WishlistDoc));
  });
  return [...map.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function updateWishlist(
  id: string,
  patch: { name?: string; description?: string; deadline?: string | null },
): Promise<Wishlist | null> {
  const existing = await findWishlistById(id);
  if (!existing) return null;
  const update: Partial<WishlistDoc> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.deadline !== undefined) update.deadline = patch.deadline;
  if (Object.keys(update).length > 0) {
    await firestore().collection(COLLECTIONS.wishlists).doc(id).update(update);
  }
  return findWishlistById(id);
}

export async function setShared(id: string, isShared: boolean): Promise<Wishlist | null> {
  const existing = await findWishlistById(id);
  if (!existing) return null;
  const shareSlug = isShared ? (existing.shareSlug ?? createSlug()) : existing.shareSlug;
  await firestore()
    .collection(COLLECTIONS.wishlists)
    .doc(id)
    .update({ isShared, shareSlug });
  return { ...existing, isShared, shareSlug };
}

export async function deleteWishlist(id: string): Promise<boolean> {
  const db = firestore();
  const itemsSnapshot = await db.collection(COLLECTIONS.items).where('wishlistId', '==', id).get();
  const itemIds = itemsSnapshot.docs.map((doc) => doc.id);

  for (const group of chunk(itemIds, 300)) {
    const comments = await db.collection(COLLECTIONS.comments).where('itemId', 'in', group).get();
    const batch = db.batch();
    comments.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const batch = db.batch();
  itemsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  const members = await db.collection(COLLECTIONS.members).where('wishlistId', '==', id).get();
  members.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection(COLLECTIONS.wishlists).doc(id));
  await batch.commit();
  return true;
}

export interface ItemsStats {
  total: number;
  purchased: number;
}

export async function findItemsStats(wishlistIds: readonly string[]): Promise<Map<string, ItemsStats>> {
  const map = new Map<string, ItemsStats>();
  if (wishlistIds.length === 0) return map;

  const db = firestore();
  await Promise.all(
    wishlistIds.map(async (wishlistId) => {
      const base = db.collection(COLLECTIONS.items).where('wishlistId', '==', wishlistId);
      const [totalSnapshot, purchasedSnapshot] = await Promise.all([
        base.count().get(),
        base.where('status', '==', 'purchased').count().get(),
      ]);
      map.set(wishlistId, {
        total: totalSnapshot.data().count,
        purchased: purchasedSnapshot.data().count,
      });
    }),
  );
  return map;
}
