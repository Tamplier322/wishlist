import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import type { AuthEvent, AuthEventType } from '../../types/domain';

interface AuthEventDoc {
  userId: string | null;
  event: AuthEventType;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

function collection() {
  return firestore().collection(COLLECTIONS.authEvents);
}

export async function createAuthEvent(input: {
  userId: string | null;
  event: AuthEventType;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  const doc: AuthEventDoc = {
    userId: input.userId,
    event: input.event,
    ip: input.ip,
    userAgent: input.userAgent,
    createdAt: new Date().toISOString(),
  };
  await collection().doc(createId()).set(doc);
}

export async function findAuthEventsByUser(
  userId: string,
  limit: number,
): Promise<AuthEvent[]> {
  const snapshot = await collection()
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as AuthEventDoc;
    return {
      id: doc.id,
      userId: data.userId,
      event: data.event,
      ip: data.ip,
      userAgent: data.userAgent,
      createdAt: data.createdAt,
    };
  });
}

export async function deleteExpiredAuthEvents(beforeIso: string): Promise<void> {
  const snapshot = await collection().where('createdAt', '<=', beforeIso).limit(400).get();
  if (snapshot.empty) return;
  const batch = firestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
