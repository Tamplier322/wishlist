import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import type { PublicUser, User } from '../../types/domain';

export interface UserWithPassword extends User {
  passwordHash: string;
}

interface UserDoc {
  username: string;
  usernameLower: string;
  email: string;
  emailLower: string;
  passwordHash: string;
  avatarColor: string;
  avatarImage: string | null;
  createdAt: string;
}

function toUser(id: string, data: UserDoc): User {
  return {
    id,
    username: data.username,
    email: data.email,
    avatarColor: data.avatarColor,
    avatarImage: data.avatarImage ?? null,
    createdAt: data.createdAt,
  };
}

function toUserWithPassword(id: string, data: UserDoc): UserWithPassword {
  return { ...toUser(id, data), passwordHash: data.passwordHash };
}

export async function createUser(input: {
  username: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
}): Promise<User> {
  const id = createId();
  const now = new Date().toISOString();
  const doc: UserDoc = {
    username: input.username,
    usernameLower: input.username.toLowerCase(),
    email: input.email,
    emailLower: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    avatarColor: input.avatarColor,
    avatarImage: null,
    createdAt: now,
  };
  await firestore().collection(COLLECTIONS.users).doc(id).set(doc);
  return {
    id,
    username: input.username,
    email: input.email,
    avatarColor: input.avatarColor,
    avatarImage: null,
    createdAt: now,
  };
}

async function findByField(
  field: 'usernameLower' | 'emailLower',
  value: string,
): Promise<UserWithPassword | null> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.users)
    .where(field, '==', value.toLowerCase())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return toUserWithPassword(doc.id, doc.data() as UserDoc);
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

export async function updateUserProfile(
  id: string,
  patch: { avatarColor?: string; avatarImage?: string | null },
): Promise<User | null> {
  const existing = await findUserById(id);
  if (!existing) return null;
  const update: Partial<UserDoc> = {};
  if (patch.avatarColor !== undefined) update.avatarColor = patch.avatarColor;
  if (patch.avatarImage !== undefined) update.avatarImage = patch.avatarImage;
  if (Object.keys(update).length > 0) {
    await firestore().collection(COLLECTIONS.users).doc(id).update(update);
  }
  return findUserById(id);
}

export async function findPublicUserById(id: string): Promise<PublicUser | null> {
  const snapshot = await firestore().collection(COLLECTIONS.users).doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as UserDoc;
  return { id, username: data.username, avatarColor: data.avatarColor };
}
