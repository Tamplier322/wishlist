import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { signUploadUrl } from '../../utils/signed-url';
import { getUsersByIds } from './helpers';
import type { ItemStatus, Priority, WishItem, WishKind } from '../../types/domain';

interface ItemRecord {
  wishlistId: string;
  authorId: string;
  categoryId: string | null;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  price: number | null;
  currency: string;
  priority: Priority;
  kind: WishKind;
  status: ItemStatus;
}

export interface ItemPatch {
  title?: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  categoryId?: string | null;
  price?: number | null;
  currency?: string;
  priority?: Priority;
  kind?: WishKind;
  status?: ItemStatus;
  reservedBy?: string | null;
}

interface ItemDoc {
  wishlistId: string;
  authorId: string;
  categoryId: string | null;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  price: number | null;
  currency: string;
  priority: string;
  kind: string;
  status: string;
  reservedBy: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

async function toItems(docs: Array<{ id: string; data: ItemDoc }>): Promise<WishItem[]> {
  const userIds = docs.flatMap(({ data }) =>
    data.reservedBy ? [data.authorId, data.reservedBy] : [data.authorId],
  );
  const users = await getUsersByIds(userIds);

  return docs.map(({ id, data }) => {
    const author = users.get(data.authorId);
    const reserver = data.reservedBy ? users.get(data.reservedBy) : undefined;
    return {
      id,
      wishlistId: data.wishlistId,
      authorId: data.authorId,
      authorName: author?.username ?? '',
      authorColor: author?.avatarColor ?? '#c9762e',
      categoryId: data.categoryId ?? null,
      title: data.title,
      description: data.description ?? '',
      link: data.link ?? '',
      imageUrl: signUploadUrl(data.imageUrl ?? ''),
      price: data.price ?? null,
      currency: data.currency,
      priority: data.priority as Priority,
      kind: data.kind as WishKind,
      status: data.status as ItemStatus,
      reservedBy: data.reservedBy ?? null,
      reservedByName: reserver?.username ?? null,
      reservedByColor: reserver?.avatarColor ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

async function nextPosition(wishlistId: string): Promise<number> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.items)
    .where('wishlistId', '==', wishlistId)
    .get();
  const max = snapshot.docs.reduce(
    (acc, doc) => Math.max(acc, Number((doc.data() as ItemDoc).position ?? 0)),
    0,
  );
  return max + 1;
}

export async function createItem(input: ItemRecord): Promise<WishItem> {
  const id = createId();
  const now = new Date().toISOString();
  const position = await nextPosition(input.wishlistId);
  const doc: ItemDoc = {
    wishlistId: input.wishlistId,
    authorId: input.authorId,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    link: input.link,
    imageUrl: input.imageUrl,
    price: input.price,
    currency: input.currency,
    priority: input.priority,
    kind: input.kind,
    status: input.status,
    reservedBy: null,
    position,
    createdAt: now,
    updatedAt: now,
  };
  await firestore().collection(COLLECTIONS.items).doc(id).set(doc);
  const [item] = await toItems([{ id, data: doc }]);
  return item;
}

export async function findItemsByWishlist(wishlistId: string): Promise<WishItem[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.items)
    .where('wishlistId', '==', wishlistId)
    .get();
  const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as ItemDoc }));
  docs.sort((left, right) => {
    const byPosition = left.data.position - right.data.position;
    if (byPosition !== 0) return byPosition;
    return right.data.createdAt.localeCompare(left.data.createdAt);
  });
  return toItems(docs);
}

export async function findItemById(id: string): Promise<WishItem | null> {
  const snapshot = await firestore().collection(COLLECTIONS.items).doc(id).get();
  if (!snapshot.exists) return null;
  const [item] = await toItems([{ id, data: snapshot.data() as ItemDoc }]);
  return item;
}

export async function updateItem(id: string, patch: ItemPatch): Promise<WishItem | null> {
  const existing = await findItemById(id);
  if (!existing) return null;
  const merged: WishItem = { ...existing, ...patch };

  const update: Partial<ItemDoc> = {
    title: merged.title,
    description: merged.description,
    link: merged.link,
    imageUrl: merged.imageUrl,
    categoryId: merged.categoryId,
    price: merged.price,
    currency: merged.currency,
    priority: merged.priority,
    kind: merged.kind,
    status: merged.status,
    reservedBy: merged.reservedBy,
    updatedAt: new Date().toISOString(),
  };
  await firestore().collection(COLLECTIONS.items).doc(id).update(update);
  return findItemById(id);
}

export async function deleteItem(id: string): Promise<boolean> {
  const db = firestore();
  const comments = await db.collection(COLLECTIONS.comments).where('itemId', '==', id).get();
  const batch = db.batch();
  comments.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection(COLLECTIONS.items).doc(id));
  await batch.commit();
  return true;
}

export async function reorderItems(wishlistId: string, orderedIds: string[]): Promise<void> {
  const db = firestore();
  const batch = db.batch();
  orderedIds.forEach((itemId, index) => {
    batch.update(db.collection(COLLECTIONS.items).doc(itemId), { position: index + 1 });
  });
  await batch.commit();
}
