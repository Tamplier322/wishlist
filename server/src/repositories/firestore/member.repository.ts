import { FieldValue } from 'firebase-admin/firestore';
import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { getUsersByIds, sortBy } from './helpers';
import type { MemberRole, WishlistMember } from '../../types/domain';

interface MemberDoc {
  id: string;
  wishlistId: string;
  userId: string;
  color: string;
  role: string;
  joinedAt: string;
}

function memberDocId(wishlistId: string, userId: string): string {
  return `${wishlistId}_${userId}`;
}

async function toMembers(docs: Array<{ id: string; data: MemberDoc }>): Promise<WishlistMember[]> {
  const users = await getUsersByIds(docs.map((doc) => doc.data.userId));
  return docs.map(({ id, data }) => {
    const user = users.get(data.userId);
    return {
      id: data.id ?? id,
      wishlistId: data.wishlistId,
      userId: data.userId,
      color: data.color,
      role: data.role as MemberRole,
      joinedAt: data.joinedAt,
      user: {
        id: data.userId,
        username: user?.username ?? '',
        avatarColor: user?.avatarColor ?? data.color,
      },
    };
  });
}

export async function addMember(input: {
  wishlistId: string;
  userId: string;
  color: string;
  role: MemberRole;
}): Promise<WishlistMember | null> {
  const existing = await findMember(input.wishlistId, input.userId);
  if (existing) return existing;

  const db = firestore();
  const ref = db.collection(COLLECTIONS.members).doc(memberDocId(input.wishlistId, input.userId));
  const doc: MemberDoc = {
    id: createId(),
    wishlistId: input.wishlistId,
    userId: input.userId,
    color: input.color,
    role: input.role,
    joinedAt: new Date().toISOString(),
  };
  await ref.set(doc);
  await db
    .collection(COLLECTIONS.wishlists)
    .doc(input.wishlistId)
    .update({ memberIds: FieldValue.arrayUnion(input.userId) });

  const [member] = await toMembers([{ id: ref.id, data: doc }]);
  return member;
}

export async function findMember(wishlistId: string, userId: string): Promise<WishlistMember | null> {
  const ref = firestore().collection(COLLECTIONS.members).doc(memberDocId(wishlistId, userId));
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const [member] = await toMembers([{ id: snapshot.id, data: snapshot.data() as MemberDoc }]);
  return member;
}

export async function findMembersByWishlist(wishlistId: string): Promise<WishlistMember[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.members)
    .where('wishlistId', '==', wishlistId)
    .get();
  const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as MemberDoc }));
  const members = await toMembers(docs);
  return sortBy(members, (member) => member.joinedAt);
}

export async function countMembers(wishlistId: string): Promise<number> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.members)
    .where('wishlistId', '==', wishlistId)
    .count()
    .get();
  return snapshot.data().count;
}

export async function findTakenColors(wishlistId: string): Promise<string[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.members)
    .where('wishlistId', '==', wishlistId)
    .get();
  return snapshot.docs.map((doc) => String((doc.data() as MemberDoc).color));
}

export async function deleteMember(wishlistId: string, userId: string): Promise<boolean> {
  const db = firestore();
  await db.collection(COLLECTIONS.members).doc(memberDocId(wishlistId, userId)).delete();
  await db
    .collection(COLLECTIONS.wishlists)
    .doc(wishlistId)
    .update({ memberIds: FieldValue.arrayRemove(userId) });
  return true;
}
