import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { signUploadUrl } from '../../utils/signed-url';
import { getUsersByIds } from './helpers';
import type { StoredItem } from '../item-record';
import type {
  ItemStatus,
  Priority,
  PublicUser,
  TrashItem,
  WishItem,
  WishKind,
} from '../../types/domain';

export type { StoredItem };

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
  reservedUntil?: string | null;
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
  priority: Priority;
  kind: WishKind;
  status: ItemStatus;
  reservedBy: string | null;
  reservedUntil: string | null;
  deletedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

function toWishItem(record: StoredItem, users: Map<string, PublicUser>): WishItem {
  const author = users.get(record.authorId);
  const reserver = record.reservedBy ? users.get(record.reservedBy) : undefined;
  return {
    id: record.id,
    wishlistId: record.wishlistId,
    authorId: record.authorId,
    authorName: author?.username ?? '',
    authorColor: author?.avatarColor ?? '#c9762e',
    categoryId: record.categoryId ?? null,
    title: record.title,
    description: record.description ?? '',
    link: record.link ?? '',
    imageUrl: signUploadUrl(record.imageUrl ?? ''),
    price: record.price ?? null,
    currency: record.currency,
    priority: record.priority,
    kind: record.kind,
    status: record.status,
    reservedBy: record.reservedBy ?? null,
    reservedByName: reserver?.username ?? null,
    reservedByColor: reserver?.avatarColor ?? null,
    reservedUntil: record.reservedUntil ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function collectUserIds(records: readonly StoredItem[]): string[] {
  return records.flatMap((record) =>
    record.reservedBy ? [record.authorId, record.reservedBy] : [record.authorId],
  );
}

async function hydrateItems(records: StoredItem[]): Promise<WishItem[]> {
  const users = await getUsersByIds(collectUserIds(records));
  return records.map((record) => toWishItem(record, users));
}

async function hydrateTrashItems(records: StoredItem[]): Promise<TrashItem[]> {
  const users = await getUsersByIds(collectUserIds(records));
  return records.map((record) => ({
    ...toWishItem(record, users),
    deletedAt: record.deletedAt ?? record.updatedAt,
  }));
}

function sortRecords(records: StoredItem[]): StoredItem[] {
  return records.sort((left, right) => {
    const byPosition = Number(left.position ?? 0) - Number(right.position ?? 0);
    if (byPosition !== 0) return byPosition;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function findItemRecordById(id: string): Promise<StoredItem | null> {
  const snapshot = await firestore().collection(COLLECTIONS.items).doc(id).get();
  if (!snapshot.exists) return null;
  return { id, ...(snapshot.data() as ItemDoc) };
}

export async function findItemRecordsByWishlist(wishlistId: string): Promise<StoredItem[]> {
  return (await findAllRecords(wishlistId)).filter((record) => !record.deletedAt);
}

async function findAllRecords(wishlistId: string): Promise<StoredItem[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.items)
    .where('wishlistId', '==', wishlistId)
    .get();
  return sortRecords(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as ItemDoc) })),
  );
}

export async function createItem(input: ItemRecord): Promise<WishItem> {
  const id = createId();
  const now = new Date().toISOString();
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
    reservedUntil: null,
    deletedAt: null,
    position: Date.now(),
    createdAt: now,
    updatedAt: now,
  };
  const usersPromise = getUsersByIds([input.authorId]);
  await firestore().collection(COLLECTIONS.items).doc(id).set(doc);
  const users = await usersPromise;
  return toWishItem({ id, ...doc }, users);
}

export async function findItemsByWishlist(wishlistId: string): Promise<WishItem[]> {
  return hydrateItems(await findItemRecordsByWishlist(wishlistId));
}

export async function findItemById(id: string): Promise<WishItem | null> {
  const record = await findItemRecordById(id);
  if (!record || record.deletedAt) return null;
  const [item] = await hydrateItems([record]);
  return item;
}

export async function updateItem(
  id: string,
  patch: ItemPatch,
  existing?: StoredItem,
): Promise<WishItem | null> {
  const current = existing ?? (await findItemRecordById(id));
  if (!current) return null;

  const next: ItemDoc = {
    wishlistId: current.wishlistId,
    authorId: current.authorId,
    categoryId: patch.categoryId !== undefined ? patch.categoryId : current.categoryId,
    title: patch.title ?? current.title,
    description: patch.description ?? current.description,
    link: patch.link ?? current.link,
    imageUrl: patch.imageUrl ?? current.imageUrl,
    price: patch.price !== undefined ? patch.price : current.price,
    currency: patch.currency ?? current.currency,
    priority: patch.priority ?? current.priority,
    kind: patch.kind ?? current.kind,
    status: patch.status ?? current.status,
    reservedBy: patch.reservedBy !== undefined ? patch.reservedBy : current.reservedBy,
    reservedUntil:
      patch.reservedUntil !== undefined ? patch.reservedUntil : current.reservedUntil,
    deletedAt: current.deletedAt ?? null,
    position: current.position,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const usersPromise = getUsersByIds(
    next.reservedBy ? [next.authorId, next.reservedBy] : [next.authorId],
  );
  await firestore().collection(COLLECTIONS.items).doc(id).update({
    categoryId: next.categoryId,
    title: next.title,
    description: next.description,
    link: next.link,
    imageUrl: next.imageUrl,
    price: next.price,
    currency: next.currency,
    priority: next.priority,
    kind: next.kind,
    status: next.status,
    reservedBy: next.reservedBy,
    reservedUntil: next.reservedUntil,
    deletedAt: next.deletedAt,
    updatedAt: next.updatedAt,
  });
  const users = await usersPromise;
  return toWishItem({ id, ...next }, users);
}

export async function deleteItem(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  await firestore()
    .collection(COLLECTIONS.items)
    .doc(id)
    .update({ deletedAt: now, updatedAt: now });
  return true;
}

export async function restoreItem(id: string): Promise<boolean> {
  await firestore()
    .collection(COLLECTIONS.items)
    .doc(id)
    .update({ deletedAt: null, updatedAt: new Date().toISOString() });
  return true;
}

export async function purgeItem(id: string): Promise<boolean> {
  const db = firestore();
  const comments = await db.collection(COLLECTIONS.comments).where('itemId', '==', id).get();
  const batch = db.batch();
  comments.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection(COLLECTIONS.items).doc(id));
  await batch.commit();
  return true;
}

export async function findDeletedItemsByWishlist(wishlistId: string): Promise<TrashItem[]> {
  const records = (await findAllRecords(wishlistId)).filter((record) => Boolean(record.deletedAt));
  records.sort((left, right) => (right.deletedAt ?? '').localeCompare(left.deletedAt ?? ''));
  return hydrateTrashItems(records);
}

export async function purgeExpiredItems(wishlistId: string, beforeIso: string): Promise<number> {
  const expired = (await findAllRecords(wishlistId)).filter(
    (record) => record.deletedAt !== null && record.deletedAt < beforeIso,
  );
  if (expired.length === 0) return 0;

  const db = firestore();
  const CHUNK = 450;
  for (let offset = 0; offset < expired.length; offset += CHUNK) {
    const batch = db.batch();
    const chunk = expired.slice(offset, offset + CHUNK);
    for (const record of chunk) {
      batch.delete(db.collection(COLLECTIONS.items).doc(record.id));
    }
    await batch.commit();
  }
  return expired.length;
}

export async function reorderItems(wishlistId: string, orderedIds: string[]): Promise<void> {
  const db = firestore();
  const CHUNK = 450;
  for (let offset = 0; offset < orderedIds.length; offset += CHUNK) {
    const batch = db.batch();
    orderedIds.slice(offset, offset + CHUNK).forEach((itemId, index) => {
      batch.update(db.collection(COLLECTIONS.items).doc(itemId), { position: offset + index + 1 });
    });
    await batch.commit();
  }
}
