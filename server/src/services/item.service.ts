import {
  createItem,
  deleteItem,
  findDeletedItemsByWishlist,
  findItemById,
  findItemRecordById,
  findItemRecordsByWishlist,
  findItemsByWishlist,
  purgeExpiredItems,
  purgeItem as purgeItemInDb,
  reorderItems as reorderItemsInDb,
  restoreItem as restoreItemInDb,
  updateItem,
  type ItemPatch,
  type StoredItem,
} from '../repositories/item.repository';
import { findCategoryById } from '../repositories/category.repository';
import { assertCanEdit, getAccessibleWishlist } from './wishlist.service';
import { releaseExpiredReservations, reservationExpiryIso } from './reservation.service';
import { logEvent } from './event.service';
import { emitWishlistChange } from '../socket/events';
import type { ItemStatus, Priority, TrashItem, WishItem, WishKind } from '../types/domain';
import { badRequest, forbidden, notFound } from '../utils/errors';

export const TRASH_RETENTION_DAYS = 30;

function trashCutoffIso(): string {
  return new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export interface ItemInput {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  categoryId?: string | null;
  price?: number | null;
  currency?: string;
  priority?: Priority;
  kind?: WishKind;
  status?: ItemStatus;
}

export async function listItems(wishlistId: string, userId: string): Promise<WishItem[]> {
  await getAccessibleWishlist(wishlistId, userId);
  return releaseExpiredReservations(await findItemsByWishlist(wishlistId));
}

export async function addItem(wishlistId: string, userId: string, input: ItemInput): Promise<WishItem> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  await assertCanEdit(wishlist, userId);
  await validateCategory(input.categoryId ?? null, wishlist.ownerId);

  const item = await createItem({
    wishlistId,
    authorId: userId,
    categoryId: input.categoryId ?? null,
    title: input.title.trim(),
    description: input.description ?? '',
    link: input.link ?? '',
    imageUrl: input.imageUrl ?? '',
    price: input.price ?? null,
    currency: input.currency ?? 'USD',
    priority: input.priority ?? 'medium',
    kind: input.kind ?? 'other',
    status: input.status ?? 'wanted',
  });

  emitWishlistChange({ wishlistId, actorId: userId, reason: 'item-added', detail: item.title });
  await logEvent({
    wishlistId,
    actorId: userId,
    action: 'item-added',
    targetId: item.id,
    title: item.title,
  });
  return item;
}

export async function editItem(itemId: string, userId: string, patch: ItemPatch): Promise<WishItem> {
  const item = await requireItemRecord(itemId);
  if (item.deletedAt) throw notFound('Желание не найдено');
  const wishlist = await getAccessibleWishlist(item.wishlistId, userId);
  await assertCanEdit(wishlist, userId);
  if (patch.categoryId !== undefined && patch.categoryId !== null) {
    await validateCategory(patch.categoryId, wishlist.ownerId);
  }

  if (patch.status !== undefined && patch.status !== item.status) {
    if (patch.status === 'reserved') {
      patch.reservedBy = userId;
      patch.reservedUntil = reservationExpiryIso();
    } else {
      if (item.status === 'reserved') {
        const canUnreserve = userId === item.reservedBy || userId === wishlist.ownerId;
        if (!canUnreserve) {
          throw forbidden('Снять бронь может только тот, кто её поставил, или владелец списка');
        }
      }
      patch.reservedBy = null;
      patch.reservedUntil = null;
    }
  }

  const updated = await updateItem(itemId, patch, item);
  if (!updated) throw notFound('Желание не найдено');

  emitWishlistChange({
    wishlistId: item.wishlistId,
    actorId: userId,
    reason: 'item-updated',
    detail: updated.title,
    status: patch.status !== undefined ? patch.status : undefined,
  });
  await logEvent({
    wishlistId: item.wishlistId,
    actorId: userId,
    action: 'item-updated',
    targetId: itemId,
    title: updated.title,
    detail: patch.status ?? null,
  });
  return updated;
}

export async function removeItem(itemId: string, userId: string): Promise<void> {
  const item = await requireItemRecord(itemId);
  const wishlist = await getAccessibleWishlist(item.wishlistId, userId);
  const canDelete = item.authorId === userId || wishlist.ownerId === userId;
  if (!canDelete) throw forbidden('Удалить желание может его автор или владелец списка');
  await deleteItem(itemId);

  emitWishlistChange({
    wishlistId: item.wishlistId,
    actorId: userId,
    reason: 'item-removed',
    detail: item.title,
  });
  await logEvent({
    wishlistId: item.wishlistId,
    actorId: userId,
    action: 'item-removed',
    targetId: itemId,
    title: item.title,
  });
}

export async function listTrash(wishlistId: string, userId: string): Promise<TrashItem[]> {
  await getAccessibleWishlist(wishlistId, userId);
  await purgeExpiredItems(wishlistId, trashCutoffIso());
  return findDeletedItemsByWishlist(wishlistId);
}

export async function restoreItem(itemId: string, userId: string): Promise<WishItem> {
  const item = await requireItemRecord(itemId);
  const wishlist = await getAccessibleWishlist(item.wishlistId, userId);
  const canManage = item.authorId === userId || wishlist.ownerId === userId;
  if (!canManage) throw forbidden('Восстановить желание может его автор или владелец списка');
  if (!item.deletedAt) throw badRequest('Желание не находится в корзине');

  await restoreItemInDb(itemId);
  emitWishlistChange({
    wishlistId: item.wishlistId,
    actorId: userId,
    reason: 'item-added',
    detail: item.title,
  });
  await logEvent({
    wishlistId: item.wishlistId,
    actorId: userId,
    action: 'item-restored',
    targetId: itemId,
    title: item.title,
  });

  const restored = await findItemById(itemId);
  if (!restored) throw notFound('Желание не найдено');
  return restored;
}

export async function purgeItem(itemId: string, userId: string): Promise<void> {
  const item = await requireItemRecord(itemId);
  const wishlist = await getAccessibleWishlist(item.wishlistId, userId);
  const canManage = item.authorId === userId || wishlist.ownerId === userId;
  if (!canManage) throw forbidden('Удалить желание может его автор или владелец списка');
  if (!item.deletedAt) throw badRequest('Желание не находится в корзине');

  await purgeItemInDb(itemId);
  emitWishlistChange({
    wishlistId: item.wishlistId,
    actorId: userId,
    reason: 'item-removed',
    detail: item.title,
  });
  await logEvent({
    wishlistId: item.wishlistId,
    actorId: userId,
    action: 'item-purged',
    targetId: itemId,
    title: item.title,
  });
}


export async function reorderItems(
  wishlistId: string,
  userId: string,
  orderedIds: string[],
): Promise<void> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  await assertCanEdit(wishlist, userId);
  const known = new Set((await findItemRecordsByWishlist(wishlistId)).map((item) => item.id));
  const validOrder = orderedIds.filter((itemId) => known.has(itemId));
  if (validOrder.length === 0) throw badRequest('Список порядка пуст');
  await reorderItemsInDb(wishlistId, validOrder);
  emitWishlistChange({ wishlistId, actorId: userId, reason: 'wishlist-updated', detail: 'reorder' });
}

async function requireItemRecord(itemId: string): Promise<StoredItem> {
  const item = await findItemRecordById(itemId);
  if (!item) throw notFound('Желание не найдено');
  return item;
}


async function validateCategory(categoryId: string | null, wishlistOwnerId: string): Promise<void> {
  if (!categoryId) return;
  const category = await findCategoryById(categoryId);
  if (!category || category.ownerId !== wishlistOwnerId) {
    throw badRequest('Выбранная категория недоступна в этом списке');
  }
}
