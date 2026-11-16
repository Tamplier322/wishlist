import {
  createItem,
  deleteItem,
  findItemById,
  findItemsByWishlist,
  reorderItems as reorderItemsInDb,
  updateItem,
  type ItemPatch,
} from '../repositories/item.repository';
import { findCategoryById } from '../repositories/category.repository';
import { getAccessibleWishlist } from './wishlist.service';
import { emitWishlistChange } from '../socket/events';
import type { ItemStatus, Priority, WishItem, WishKind } from '../types/domain';
import { badRequest, forbidden, notFound } from '../utils/errors';

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
  return findItemsByWishlist(wishlistId);
}

export async function addItem(wishlistId: string, userId: string, input: ItemInput): Promise<WishItem> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
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
  return item;
}

export async function editItem(itemId: string, userId: string, patch: ItemPatch): Promise<WishItem> {
  const item = await requireItem(itemId);
  const wishlist = await getAccessibleWishlist(item.wishlistId, userId);
  if (patch.categoryId !== undefined && patch.categoryId !== null) {
    await validateCategory(patch.categoryId, wishlist.ownerId);
  }

  if (patch.status !== undefined && patch.status !== item.status) {
    if (patch.status === 'reserved') {
      patch.reservedBy = userId;
    } else {
      if (item.status === 'reserved') {
        const canUnreserve = userId === item.reservedBy || userId === wishlist.ownerId;
        if (!canUnreserve) {
          throw forbidden('Снять бронь может только тот, кто её поставил, или владелец списка');
        }
      }
      patch.reservedBy = null;
    }
  }

  const updated = await updateItem(itemId, patch);
  if (!updated) throw notFound('Желание не найдено');

  emitWishlistChange({
    wishlistId: item.wishlistId,
    actorId: userId,
    reason: 'item-updated',
    detail: updated.title,
    status: patch.status !== undefined ? patch.status : undefined,
  });
  return updated;
}

export async function removeItem(itemId: string, userId: string): Promise<void> {
  const item = await requireItem(itemId);
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
}


export async function reorderItems(
  wishlistId: string,
  userId: string,
  orderedIds: string[],
): Promise<void> {
  await getAccessibleWishlist(wishlistId, userId);
  const known = new Set((await findItemsByWishlist(wishlistId)).map((item) => item.id));
  const validOrder = orderedIds.filter((itemId) => known.has(itemId));
  if (validOrder.length === 0) throw badRequest('Список порядка пуст');
  await reorderItemsInDb(wishlistId, validOrder);
  emitWishlistChange({ wishlistId, actorId: userId, reason: 'wishlist-updated', detail: 'reorder' });
}

async function requireItem(itemId: string): Promise<WishItem> {
  const item = await findItemById(itemId);
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
