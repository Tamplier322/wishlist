import {
  createInvite,
  findIncomingInvites,
  findInviteById,
  findPendingInvite,
  updateInviteStatus,
} from '../repositories/invite.repository';
import { addMember, countMembers, findMember, findTakenColors } from '../repositories/member.repository';
import { findUserByUsername, findPublicUserById } from '../repositories/user.repository';
import { findWishlistByInviteCode } from '../repositories/wishlist.repository';
import { pickMemberColor } from '../utils/colors';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { emitWishlistChange } from '../socket/events';
import { getAccessibleWishlist, MAX_TOTAL_MEMBERS, requireOwner } from './wishlist.service';
import type { Invite, PublicUser } from '../types/domain';


export async function sendInvite(
  wishlistId: string,
  fromUserId: string,
  username: string,
): Promise<Invite> {
  const wishlist = await getAccessibleWishlist(wishlistId, fromUserId);
  requireOwner(wishlist, fromUserId);

  const target = await findUserByUsername(username.trim());
  if (!target) throw notFound('Пользователь с таким именем не найден');
  if (target.id === fromUserId) throw badRequest('Нельзя пригласить самого себя');

  const [alreadyMember, memberCount, pendingInvite] = await Promise.all([
    findMember(wishlistId, target.id),
    countMembers(wishlistId),
    findPendingInvite(wishlistId, target.id),
  ]);
  if (alreadyMember) throw conflict('Пользователь уже участник списка');
  if (memberCount >= MAX_TOTAL_MEMBERS) {
    throw conflict(`Достигнут лимит участников (${MAX_TOTAL_MEMBERS})`);
  }
  if (pendingInvite) throw conflict('Приглашение уже отправлено и ждёт ответа');

  return createInvite({ wishlistId, fromUserId, toUserId: target.id });
}

export async function listIncoming(userId: string): Promise<Invite[]> {
  return findIncomingInvites(userId);
}


export async function respondToInvite(
  inviteId: string,
  userId: string,
  accept: boolean,
): Promise<Invite> {
  const invite = await findInviteById(inviteId);
  if (!invite) throw notFound('Приглашение не найдено');
  if (invite.toUserId !== userId) throw forbidden('Это приглашение адресовано не вам');
  if (invite.status !== 'pending') throw conflict('Приглашение уже обработано');

  if (accept) {
    const [memberCount, takenColors] = await Promise.all([
      countMembers(invite.wishlistId),
      findTakenColors(invite.wishlistId),
    ]);
    if (memberCount >= MAX_TOTAL_MEMBERS) {
      throw conflict(`Достигнут лимит участников (${MAX_TOTAL_MEMBERS})`);
    }
    await addMember({
      wishlistId: invite.wishlistId,
      userId,
      color: pickMemberColor(takenColors),
      role: 'member',
    });
    emitWishlistChange({
      wishlistId: invite.wishlistId,
      actorId: userId,
      reason: 'wishlist-updated',
      detail: 'member-joined',
    });
  }

  const updated = await updateInviteStatus(inviteId, accept ? 'accepted' : 'declined');
  if (!updated) throw notFound('Приглашение не найдено');
  return updated;
}


export async function getInviteInfo(
  code: string,
): Promise<{ wishlistId: string; name: string; owner: PublicUser }> {
  const wishlist = await findWishlistByInviteCode(code);
  if (!wishlist) throw notFound('Приглашение не найдено');

  const owner = await findPublicUserById(wishlist.ownerId);
  if (!owner) throw notFound('Владелец списка не найден');

  return { wishlistId: wishlist.id, name: wishlist.name, owner };
}


export async function joinByInviteCode(userId: string, code: string): Promise<{ wishlistId: string }> {
  const wishlist = await findWishlistByInviteCode(code);
  if (!wishlist) throw notFound('Приглашение не найдено');

  const [alreadyMember, memberCount, takenColors] = await Promise.all([
    findMember(wishlist.id, userId),
    countMembers(wishlist.id),
    findTakenColors(wishlist.id),
  ]);
  if (alreadyMember) return { wishlistId: wishlist.id };
  if (memberCount >= MAX_TOTAL_MEMBERS) {
    throw conflict(`Достигнут лимит участников (${MAX_TOTAL_MEMBERS})`);
  }

  await addMember({
    wishlistId: wishlist.id,
    userId,
    color: pickMemberColor(takenColors),
    role: 'member',
  });
  emitWishlistChange({
    wishlistId: wishlist.id,
    actorId: userId,
    reason: 'wishlist-updated',
    detail: 'member-joined',
  });

  return { wishlistId: wishlist.id };
}
