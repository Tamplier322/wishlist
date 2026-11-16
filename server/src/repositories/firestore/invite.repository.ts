import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { getUsersByIds } from './helpers';
import type { Invite, InviteStatus } from '../../types/domain';

interface InviteDoc {
  wishlistId: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: string;
}

async function toInvites(docs: Array<{ id: string; data: InviteDoc }>): Promise<Invite[]> {
  const db = firestore();
  const wishlistIds = [...new Set(docs.map((doc) => doc.data.wishlistId))];
  const userIds = [...new Set(docs.map((doc) => doc.data.fromUserId))];

  const [wishlistSnapshots, users] = await Promise.all([
    Promise.all(wishlistIds.map((id) => db.collection(COLLECTIONS.wishlists).doc(id).get())),
    getUsersByIds(userIds),
  ]);
  const wishlistNames = new Map<string, string>();
  wishlistSnapshots.forEach((snapshot) => {
    if (snapshot.exists) wishlistNames.set(snapshot.id, String(snapshot.data()?.name ?? ''));
  });

  return docs.map(({ id, data }) => ({
    id,
    wishlistId: data.wishlistId,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    status: data.status as InviteStatus,
    createdAt: data.createdAt,
    wishlistName: wishlistNames.get(data.wishlistId) ?? '',
    fromUsername: users.get(data.fromUserId)?.username ?? '',
  }));
}

export async function createInvite(input: {
  wishlistId: string;
  fromUserId: string;
  toUserId: string;
}): Promise<Invite> {
  const id = createId();
  const doc: InviteDoc = {
    wishlistId: input.wishlistId,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await firestore().collection(COLLECTIONS.invites).doc(id).set(doc);
  const [invite] = await toInvites([{ id, data: doc }]);
  return invite;
}

export async function findInviteById(id: string): Promise<Invite | null> {
  const snapshot = await firestore().collection(COLLECTIONS.invites).doc(id).get();
  if (!snapshot.exists) return null;
  const [invite] = await toInvites([{ id, data: snapshot.data() as InviteDoc }]);
  return invite;
}

export async function findPendingInvite(wishlistId: string, toUserId: string): Promise<Invite | null> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.invites)
    .where('toUserId', '==', toUserId)
    .get();
  const found = snapshot.docs.find((doc) => {
    const data = doc.data() as InviteDoc;
    return data.wishlistId === wishlistId && data.status === 'pending';
  });
  if (!found) return null;
  const [invite] = await toInvites([{ id: found.id, data: found.data() as InviteDoc }]);
  return invite;
}

export async function findIncomingInvites(userId: string): Promise<Invite[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.invites)
    .where('toUserId', '==', userId)
    .get();
  const docs = snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as InviteDoc }))
    .filter(({ data }) => data.status === 'pending')
    .sort((left, right) => right.data.createdAt.localeCompare(left.data.createdAt));
  return toInvites(docs);
}

export async function updateInviteStatus(id: string, status: InviteStatus): Promise<Invite | null> {
  const ref = firestore().collection(COLLECTIONS.invites).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  await ref.update({ status });
  return findInviteById(id);
}
