import { firestore, COLLECTIONS } from '../../config/firebase';

export interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

interface RefreshTokenDoc {
  userId: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string | null;
}

function collection() {
  return firestore().collection(COLLECTIONS.refreshTokens);
}

export async function createRefreshToken(input: {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}): Promise<void> {
  const doc: RefreshTokenDoc = {
    userId: input.userId,
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  };
  await collection().doc(input.tokenHash).set(doc);
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
  const snapshot = await collection().doc(tokenHash).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as RefreshTokenDoc | undefined;
  if (!data) return null;
  return {
    tokenHash,
    userId: data.userId,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    revokedAt: data.revokedAt ?? null,
  };
}

export async function revokeRefreshTokenRecord(tokenHash: string): Promise<void> {
  await collection()
    .doc(tokenHash)
    .set({ revokedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await collection().doc(tokenHash).delete();
}

export async function deleteUserRefreshTokens(userId: string): Promise<void> {
  const snapshot = await collection().where('userId', '==', userId).get();
  if (snapshot.empty) return;
  const batch = firestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteExpiredRefreshTokens(nowIso: string): Promise<void> {
  const snapshot = await collection()
    .where('expiresAt', '<=', nowIso)
    .limit(400)
    .get();
  if (snapshot.empty) return;
  const batch = firestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
