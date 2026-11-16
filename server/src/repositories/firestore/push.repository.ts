import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { chunk } from './helpers';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface PushSubscriptionInput {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushDoc {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export async function upsertSubscription(input: PushSubscriptionInput): Promise<void> {
  const db = firestore();
  const snapshot = await db
    .collection(COLLECTIONS.pushSubscriptions)
    .where('endpoint', '==', input.endpoint)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({ userId: input.userId, p256dh: input.p256dh, auth: input.auth });
    return;
  }

  const doc: PushDoc = {
    userId: input.userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    createdAt: new Date().toISOString(),
  };
  await db.collection(COLLECTIONS.pushSubscriptions).doc(createId()).set(doc);
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const db = firestore();
  const snapshot = await db
    .collection(COLLECTIONS.pushSubscriptions)
    .where('endpoint', '==', endpoint)
    .get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function findSubscriptionsByUsers(userIds: readonly string[]): Promise<
  Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }>
> {
  if (userIds.length === 0) return [];
  const db = firestore();
  const result: Array<{ endpoint: string; p256dh: string; auth: string; user_id: string }> = [];

  for (const group of chunk([...new Set(userIds)], 10)) {
    const snapshot = await db
      .collection(COLLECTIONS.pushSubscriptions)
      .where('userId', 'in', group)
      .get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as PushDoc;
      result.push({
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_id: data.userId,
      });
    });
  }
  return result;
}
