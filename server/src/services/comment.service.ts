import { createComment, findCommentsByItem } from '../repositories/comment.repository';
import { findItemById } from '../repositories/item.repository';
import { findUserById } from '../repositories/user.repository';
import { getAccessibleWishlist } from './wishlist.service';
import { emitWishlistChange } from '../socket/events';
import type { Comment } from '../types/domain';
import { badRequest, notFound } from '../utils/errors';

const MAX_TEXT_LENGTH = 500;

export async function listComments(itemId: string, userId: string): Promise<Comment[]> {
  const item = await findItemById(itemId);
  if (!item) throw notFound('Желание не найдено');
  await getAccessibleWishlist(item.wishlistId, userId);
  return findCommentsByItem(itemId);
}

export async function addComment(
  itemId: string,
  userId: string,
  rawText: string,
  hideFromAuthor: boolean,
): Promise<Comment> {
  const item = await findItemById(itemId);
  if (!item) throw notFound('Желание не найдено');
  await getAccessibleWishlist(item.wishlistId, userId);

  const text = rawText.trim();
  if (!text) throw badRequest('Комментарий пуст');
  if (text.length > MAX_TEXT_LENGTH) throw badRequest(`Максимум ${MAX_TEXT_LENGTH} символов`);

  const author = await findUserById(userId);
  if (!author) throw notFound('Пользователь не найден');

  const comment = await createComment({
    itemId,
    authorId: userId,
    text,

    hideFromAuthor: hideFromAuthor && item.authorId !== userId,
  });

  emitWishlistChange({
    wishlistId: item.wishlistId,
    actorId: userId,
    reason: 'comment-added',
    detail: comment.text.slice(0, 60),
  });

  return comment;
}
