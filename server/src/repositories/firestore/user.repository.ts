import { FieldValue } from 'firebase-admin/firestore';
import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import { deleteWishlist, findWishlistsByUser } from './wishlist.repository';
import type { PublicUser, User } from '../../types/domain';

export interface UserWithPassword extends User {
  passwordHash: string;
}

interface UserDoc {
  username: string;
  usernameLower: string;
  displayName?: string;
  email: string;
  emailLower: string;
  passwordHash: string;
  avatarColor: string;
  avatarImage: string | null;
  hasPassword?: boolean;
  createdAt: string;
}

function toUser(id: string, data: UserDoc): User {
  return {
    id,
    username: data.username,
    displayName: data.displayName?.trim() || data.username,
    email: data.email,
    avatarColor: data.avatarColor,
    avatarImage: data.avatarImage ?? null,
    hasPassword: data.hasPassword !== false,
    createdAt: data.createdAt,
  };
}

function toUserWithPassword(id: string, data: UserDoc): UserWithPassword {
  return { ...toUser(id, data), passwordHash: data.passwordHash };
}

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

function normalizedLookupFields(
  data: Partial<UserDoc>,
): Partial<Pick<UserDoc, 'usernameLower' | 'emailLower'>> {
  const fields: Partial<Pick<UserDoc, 'usernameLower' | 'emailLower'>> = {};
  if (typeof data.username === 'string') {
    fields.usernameLower = normalizeLookupValue(data.username);
  }
  if (typeof data.email === 'string') {
    fields.emailLower = normalizeLookupValue(data.email);
  }
  return fields;
}

export async function createUser(input: {
  username: string;
  displayName?: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  hasPassword?: boolean;
}): Promise<User> {
  const id = createId();
  const now = new Date().toISOString();
  const hasPassword = input.hasPassword !== false;
  const displayName = input.displayName?.trim() || input.username;
  const doc: UserDoc = {
    username: input.username,
    usernameLower: normalizeLookupValue(input.username),
    displayName,
    email: input.email,
    emailLower: normalizeLookupValue(input.email),
    passwordHash: input.passwordHash,
    avatarColor: input.avatarColor,
    avatarImage: null,
    hasPassword,
    createdAt: now,
  };
  await firestore().collection(COLLECTIONS.users).doc(id).set(doc);
  return {
    id,
    username: input.username,
    displayName,
    email: input.email,
    avatarColor: input.avatarColor,
    avatarImage: null,
    hasPassword,
    createdAt: now,
  };
}

async function queryFirst(field: string, value: string): Promise<UserWithPassword | null> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.users)
    .where(field, '==', value)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return toUserWithPassword(doc.id, doc.data() as UserDoc);
}

async function updateLookupFields(id: string, data: Partial<UserDoc>): Promise<void> {
  const fields = normalizedLookupFields(data);
  if (Object.keys(fields).length === 0) return;
  await firestore().collection(COLLECTIONS.users).doc(id).update(fields);
}

async function findByField(
  field: 'usernameLower' | 'emailLower',
  value: string,
): Promise<UserWithPassword | null> {
  const normalized = normalizeLookupValue(value);

  const indexed = await queryFirst(field, normalized);
  if (indexed) return indexed;

  const rawField = field === 'usernameLower' ? 'username' : 'email';
  const raw = value.trim();
  const legacy = (await queryFirst(rawField, raw)) ?? (await queryFirst(rawField, normalized));
  if (!legacy) return null;

  await updateLookupFields(legacy.id, legacy);
  return legacy;
}

export async function backfillUserLookupFields(): Promise<void> {
  const db = firestore();
  const snapshot = await db.collection(COLLECTIONS.users).get();
  if (snapshot.empty) return;

  let batch = db.batch();
  let pending = 0;
  let updated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as Partial<UserDoc>;
    const fields = normalizedLookupFields(data);
    const usernameStale =
      fields.usernameLower !== undefined && fields.usernameLower !== data.usernameLower;
    const emailStale = fields.emailLower !== undefined && fields.emailLower !== data.emailLower;
    if (!usernameStale && !emailStale) continue;

    batch.update(doc.ref, fields);
    pending += 1;
    updated += 1;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  if (updated > 0) {
    console.log(`Firestore: обновлены поля поиска у ${updated} пользователей`);
  }
}

export async function findUserByLogin(login: string): Promise<UserWithPassword | null> {
  const [byUsername, byEmail] = await Promise.all([
    findByField('usernameLower', login),
    findByField('emailLower', login),
  ]);
  return byUsername ?? byEmail;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const found = await findByField('usernameLower', username);
  if (!found) return null;
  const { passwordHash: _passwordHash, ...user } = found;
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const found = await findByField('emailLower', email);
  if (!found) return null;
  const { passwordHash: _passwordHash, ...user } = found;
  return user;
}

export async function findUserById(id: string): Promise<User | null> {
  const snapshot = await firestore().collection(COLLECTIONS.users).doc(id).get();
  if (!snapshot.exists) return null;
  return toUser(snapshot.id, snapshot.data() as UserDoc);
}

export async function findUserWithPasswordById(id: string): Promise<UserWithPassword | null> {
  const snapshot = await firestore().collection(COLLECTIONS.users).doc(id).get();
  if (!snapshot.exists) return null;
  return toUserWithPassword(snapshot.id, snapshot.data() as UserDoc);
}

export async function updatePassword(id: string, passwordHash: string): Promise<User | null> {
  await firestore()
    .collection(COLLECTIONS.users)
    .doc(id)
    .update({ passwordHash, hasPassword: true });
  return findUserById(id);
}

export async function updateUserProfile(
  id: string,
  patch: {
    displayName?: string;
    username?: string;
    email?: string;
    avatarColor?: string;
    avatarImage?: string | null;
  },
): Promise<User | null> {
  const existing = await findUserById(id);
  if (!existing) return null;
  const update: Partial<UserDoc> = {};
  if (patch.displayName !== undefined) update.displayName = patch.displayName;
  if (patch.username !== undefined) {
    update.username = patch.username;
    update.usernameLower = normalizeLookupValue(patch.username);
  }
  if (patch.email !== undefined) {
    update.email = patch.email;
    update.emailLower = normalizeLookupValue(patch.email);
  }
  if (patch.avatarColor !== undefined) update.avatarColor = patch.avatarColor;
  if (patch.avatarImage !== undefined) update.avatarImage = patch.avatarImage;
  if (Object.keys(update).length > 0) {
    await firestore().collection(COLLECTIONS.users).doc(id).update(update);
  }
  return findUserById(id);
}

async function deleteWhere(collection: string, field: string, value: string): Promise<void> {
  const snapshot = await firestore().collection(collection).where(field, '==', value).get();
  if (snapshot.empty) return;
  const batch = firestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteUserAccount(id: string): Promise<void> {
  const wishlists = await findWishlistsByUser(id);
  const owned = wishlists.filter((wishlist) => wishlist.ownerId === id);
  const shared = wishlists.filter((wishlist) => wishlist.ownerId !== id);

  for (const wishlist of owned) {
    await deleteWishlist(wishlist.id);
  }

  await Promise.all(
    shared.map((wishlist) =>
      firestore()
        .collection(COLLECTIONS.wishlists)
        .doc(wishlist.id)
        .update({ memberIds: FieldValue.arrayRemove(id) }),
    ),
  );

  await Promise.all([
    deleteWhere(COLLECTIONS.members, 'userId', id),
    deleteWhere(COLLECTIONS.invites, 'fromUserId', id),
    deleteWhere(COLLECTIONS.invites, 'toUserId', id),
    deleteWhere(COLLECTIONS.events, 'actorId', id),
    deleteWhere(COLLECTIONS.comments, 'authorId', id),
    deleteWhere(COLLECTIONS.pushSubscriptions, 'userId', id),
    deleteWhere(COLLECTIONS.oauthAccounts, 'userId', id),
    deleteWhere(COLLECTIONS.refreshTokens, 'userId', id),
    deleteWhere(COLLECTIONS.authEvents, 'userId', id),
  ]);

  for (const wishlist of owned) {
    await deleteWhere(COLLECTIONS.events, 'wishlistId', wishlist.id);
    await deleteWhere(COLLECTIONS.invites, 'wishlistId', wishlist.id);
  }

  await firestore().collection(COLLECTIONS.users).doc(id).delete();
}

export async function findPublicUserById(id: string): Promise<PublicUser | null> {
  const snapshot = await firestore().collection(COLLECTIONS.users).doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as UserDoc;
  return { id, username: data.username, avatarColor: data.avatarColor };
}
