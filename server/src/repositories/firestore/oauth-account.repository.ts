import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import type { OAuthAccount, OAuthProvider } from '../../types/domain';

interface OAuthAccountDoc {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthAccountInput {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function toAccount(id: string, data: OAuthAccountDoc): OAuthAccount {
  return {
    id,
    userId: data.userId,
    provider: data.provider,
    providerUserId: data.providerUserId,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createOAuthAccount(input: OAuthAccountInput): Promise<OAuthAccount> {
  const id = createId();
  const now = new Date().toISOString();
  const doc: OAuthAccountDoc = {
    userId: input.userId,
    provider: input.provider,
    providerUserId: input.providerUserId,
    email: input.email ?? null,
    displayName: input.displayName ?? null,
    avatarUrl: input.avatarUrl ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await firestore().collection(COLLECTIONS.oauthAccounts).doc(id).set(doc);
  return toAccount(id, doc);
}

export async function findOAuthAccount(
  provider: OAuthProvider,
  providerUserId: string,
): Promise<OAuthAccount | null> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.oauthAccounts)
    .where('provider', '==', provider)
    .where('providerUserId', '==', providerUserId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return toAccount(doc.id, doc.data() as OAuthAccountDoc);
}

export async function findOAuthAccountsByUser(userId: string): Promise<OAuthAccount[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.oauthAccounts)
    .where('userId', '==', userId)
    .get();
  return snapshot.docs
    .map((doc) => toAccount(doc.id, doc.data() as OAuthAccountDoc))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function updateOAuthAccountProfile(
  id: string,
  patch: { email?: string | null; displayName?: string | null; avatarUrl?: string | null },
): Promise<void> {
  const update: Record<string, string | null> = { updatedAt: new Date().toISOString() };
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.displayName !== undefined) update.displayName = patch.displayName;
  if (patch.avatarUrl !== undefined) update.avatarUrl = patch.avatarUrl;
  await firestore().collection(COLLECTIONS.oauthAccounts).doc(id).update(update);
}

export async function deleteOAuthAccount(userId: string, provider: OAuthProvider): Promise<boolean> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.oauthAccounts)
    .where('userId', '==', userId)
    .where('provider', '==', provider)
    .limit(1)
    .get();
  if (snapshot.empty) return false;
  await snapshot.docs[0].ref.delete();
  return true;
}
