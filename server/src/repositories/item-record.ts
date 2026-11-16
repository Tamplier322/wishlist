import type { ItemStatus, Priority, WishKind } from '../types/domain';

export interface StoredItem {
  id: string;
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
