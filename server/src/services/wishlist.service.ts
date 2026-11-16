import {
  createWishlist,
  deleteWishlist,
  findWishlistById,
  findWishlistBySlug,
  findWishlistsByUser,
  setShared,
  updateWishlist,
} from '../repositories/wishlist.repository';
import {
  addMember,
  deleteMember,
  findMember,
  findMembersByWishlist,
} from '../repositories/member.repository';
import { findItemsStats } from '../repositories/wishlist.repository';
import type { WishlistWithStats } from '../types/domain';
import { findCategoriesByOwner } from '../repositories/category.repository';
import { findItemsByWishlist } from '../repositories/item.repository';
import { findUserById, findPublicUserById } from '../repositories/user.repository';
import type {
  Category,
  PublicUser,
  SharedWishlistView,
  Wishlist,
  WishlistContent,
  WishlistMember,
  WishItem,
} from '../types/domain';
import { emitWishlistChange } from '../socket/events';
import { badRequest, forbidden, notFound } from '../utils/errors';


export const MAX_TOTAL_MEMBERS = 5;

export async function listWishlists(userId: string): Promise<WishlistWithStats[]> {
  const wishlists = await findWishlistsByUser(userId);
  const stats = await findItemsStats(wishlists.map((wishlist) => wishlist.id));

  return wishlists.map((wishlist) => ({
    ...wishlist,
    stats: stats.get(wishlist.id) ?? { total: 0, purchased: 0 },
  }));
}

export async function createWishlistForUser(
  userId: string,
  input: { name: string; description?: string; workspaceId?: string | null },
): Promise<Wishlist> {
  const user = await findUserById(userId);
  if (!user) throw notFound('Пользователь не найден');

  const wishlist = await createWishlist({
    ownerId: userId,
    name: input.name,
    description: input.description,
    workspaceId: input.workspaceId ?? null,
  });

  await addMember({ wishlistId: wishlist.id, userId, color: user.avatarColor, role: 'owner' });
  return wishlist;
}


export async function getAccessibleWishlist(wishlistId: string, userId: string): Promise<Wishlist> {
  const wishlist = await findWishlistById(wishlistId);
  if (!wishlist) throw notFound('Список не найден');
  if (wishlist.ownerId !== userId && !(await findMember(wishlistId, userId))) {
    throw forbidden('Нет доступа к этому списку');
  }
  return wishlist;
}

export function requireOwner(wishlist: Wishlist, userId: string): void {
  if (wishlist.ownerId !== userId) throw forbidden('Доступно только владельцу списка');
}

export async function editWishlist(
  wishlistId: string,
  userId: string,
  patch: { name?: string; description?: string; deadline?: string | null; workspaceId?: string | null },
): Promise<Wishlist> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  requireOwner(wishlist, userId);
  const updated = await updateWishlist(wishlistId, patch);
  if (!updated) throw notFound('Список не найден');
  emitWishlistChange({ wishlistId, actorId: userId, reason: 'wishlist-updated' });
  return updated;
}

export async function removeWishlist(wishlistId: string, userId: string): Promise<void> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  requireOwner(wishlist, userId);
  await deleteWishlist(wishlistId);
}

export async function setWishlistShared(
  wishlistId: string,
  userId: string,
  isShared: boolean,
): Promise<Wishlist> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  requireOwner(wishlist, userId);
  const updated = await setShared(wishlistId, isShared);
  if (!updated) throw notFound('Список не найден');
  return updated;
}

export async function getWishlistContent(wishlistId: string, userId: string): Promise<WishlistContent> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  const [members, categories, items] = await Promise.all([
    findMembersByWishlist(wishlistId),
    findCategoriesByOwner(wishlist.ownerId),
    findItemsByWishlist(wishlistId),
  ]);
  const isOwner = wishlist.ownerId === userId;
  return {
    wishlist,
    members,
    categories,
    items,

    inviteCode: isOwner ? wishlist.inviteCode : undefined,
  };
}

export async function listMembers(wishlistId: string, userId: string): Promise<WishlistMember[]> {
  const wishlist = await getAccessibleWishlist(wishlistId, userId);
  return findMembersByWishlist(wishlist.id);
}


export async function removeMemberFromWishlist(
  wishlistId: string,
  actorId: string,
  targetUserId: string,
): Promise<void> {
  const wishlist = await getAccessibleWishlist(wishlistId, actorId);
  requireOwner(wishlist, actorId);
  if (targetUserId === wishlist.ownerId) throw badRequest('Владельца нельзя исключить из списка');
  await deleteMember(wishlistId, targetUserId);
  emitWishlistChange({ wishlistId, actorId, reason: 'member-removed' });
}


export async function getSharedWishlist(slug: string): Promise<SharedWishlistView> {
  const wishlist = await findWishlistBySlug(slug);
  if (!wishlist) throw notFound('Список не найден или доступ по ссылке закрыт');

  const owner: PublicUser | null = await findPublicUserById(wishlist.ownerId);
  if (!owner) throw notFound('Владелец списка не найден');

  const [members, categories, items] = await Promise.all([
    findMembersByWishlist(wishlist.id),
    findCategoriesByOwner(wishlist.ownerId),
    findItemsByWishlist(wishlist.id),
  ]);

  return {
    wishlist: {
      id: wishlist.id,
      name: wishlist.name,
      description: wishlist.description,
      shareSlug: wishlist.shareSlug,
    },
    owner,
    members,
    categories,
    items,
  };
}
