import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import { signUploadUrl } from '../../utils/signed-url';
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

interface ItemRow {
  id: string;
  wishlist_id: string;
  author_id: string;
  category_id: string | null;
  title: string;
  description: string;
  link: string;
  image_url: string;
  price: number | null;
  currency: string;
  priority: string;
  kind: string;
  status: string;
  reserved_by: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_color: string;
  reserved_by_name: string | null;
  reserved_by_color: string | null;
}

function toItem(row: ItemRow): WishItem {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorColor: row.author_color,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    link: row.link,
    imageUrl: signUploadUrl(row.image_url),
    price: row.price,
    currency: row.currency,
    priority: row.priority as Priority,
    kind: row.kind as WishKind,
    status: row.status as ItemStatus,
    reservedBy: row.reserved_by,
    reservedByName: row.reserved_by_name,
    reservedByColor: row.reserved_by_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT i.*, u.username AS author_name, u.avatar_color AS author_color,
         ru.username AS reserved_by_name, ru.avatar_color AS reserved_by_color
  FROM items i
  JOIN users u ON u.id = i.author_id
  LEFT JOIN users ru ON ru.id = i.reserved_by
`;

async function nextPosition(wishlistId: string): Promise<number> {
  const row = await getRow<{ max: number | null }>(
    'SELECT MAX(position) AS max FROM items WHERE wishlist_id = ?',
    [wishlistId],
  );
  return Number(row?.max ?? 0) + 1;
}

export async function createItem(input: ItemRecord): Promise<WishItem> {
  const id = createId();
  const now = new Date().toISOString();
  const position = await nextPosition(input.wishlistId);
  await execRun(
    `INSERT INTO items
      (id, wishlist_id, author_id, category_id, title, description, link, image_url,
       price, currency, priority, kind, status, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.wishlistId,
      input.authorId,
      input.categoryId,
      input.title,
      input.description,
      input.link,
      input.imageUrl,
      input.price,
      input.currency,
      input.priority,
      input.kind,
      input.status,
      position,
      now,
      now,
    ],
  );
  const item = await findItemById(id);
  if (!item) throw new Error('Failed to create item');
  return item;
}

export async function findItemsByWishlist(wishlistId: string): Promise<WishItem[]> {
  const rows = await getRows<ItemRow>(
    `${SELECT} WHERE i.wishlist_id = ? ORDER BY i.position, i.created_at DESC`,
    [wishlistId],
  );
  return rows.map(toItem);
}

export async function findItemById(id: string): Promise<WishItem | null> {
  const row = await getRow<ItemRow>(`${SELECT} WHERE i.id = ?`, [id]);
  return row ? toItem(row) : null;
}

export async function updateItem(id: string, patch: ItemPatch): Promise<WishItem | null> {
  const existing = await findItemById(id);
  if (!existing) return null;
  const merged: WishItem = { ...existing, ...patch };
  await execRun(
    `UPDATE items SET
       title = ?, description = ?, link = ?, image_url = ?, category_id = ?,
       price = ?, currency = ?, priority = ?, kind = ?, status = ?, reserved_by = ?, updated_at = ?
     WHERE id = ?`,
    [
      merged.title,
      merged.description,
      merged.link,
      merged.imageUrl,
      merged.categoryId,
      merged.price,
      merged.currency,
      merged.priority,
      merged.kind,
      merged.status,
      merged.reservedBy,
      new Date().toISOString(),
      id,
    ],
  );
  return findItemById(id);
}

export async function deleteItem(id: string): Promise<boolean> {
  await execRun(`DELETE FROM items WHERE id = ?`, [id]);
  return true;
}


export async function reorderItems(wishlistId: string, orderedIds: string[]): Promise<void> {
  for (let index = 0; index < orderedIds.length; index++) {
    await execRun(`UPDATE items SET position = ? WHERE id = ? AND wishlist_id = ?`, [
      index + 1,
      orderedIds[index],
      wishlistId,
    ]);
  }
}
