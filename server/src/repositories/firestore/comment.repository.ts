import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { getUsersByIds } from './helpers';
import type { Comment, PublicUser } from '../../types/domain';

interface CommentDoc {
  itemId: string;
  authorId: string;
  text: string;
  hideFromAuthor: boolean;
  createdAt: string;
}

async function toComments(docs: Array<{ id: string; data: CommentDoc }>): Promise<Comment[]> {
  const users = await getUsersByIds(docs.map((doc) => doc.data.authorId));
  return docs.map(({ id, data }) => {
    const found = users.get(data.authorId);
    const author: PublicUser = {
      id: data.authorId,
      username: found?.username ?? '',
      avatarColor: found?.avatarColor ?? '#c9762e',
    };
    return {
      id,
      itemId: data.itemId,
      author,
      text: data.text,
      hideFromAuthor: data.hideFromAuthor === true,
      createdAt: data.createdAt,
    };
  });
}

export async function findCommentsByItem(itemId: string): Promise<Comment[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.comments)
    .where('itemId', '==', itemId)
    .get();
  const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as CommentDoc }));
  docs.sort((left, right) => left.data.createdAt.localeCompare(right.data.createdAt));
  return toComments(docs);
}

export async function createComment(input: {
  itemId: string;
  authorId: string;
  text: string;
  hideFromAuthor: boolean;
}): Promise<Comment> {
  const id = createId();
  const doc: CommentDoc = {
    itemId: input.itemId,
    authorId: input.authorId,
    text: input.text,
    hideFromAuthor: input.hideFromAuthor,
    createdAt: new Date().toISOString(),
  };
  await firestore().collection(COLLECTIONS.comments).doc(id).set(doc);
  const [comment] = await toComments([{ id, data: doc }]);
  return comment;
}
