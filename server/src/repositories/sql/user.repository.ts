import { execRun, getRow } from '../../config/database';
import { createId } from '../../utils/ids';
import type { PublicUser, User } from '../../types/domain';

export interface UserWithPassword extends User {
  passwordHash: string;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  avatar_image: string | null;
  has_password: number;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    email: row.email,
    avatarColor: row.avatar_color,
    avatarImage: row.avatar_image,
    hasPassword: row.has_password !== 0,
    createdAt: row.created_at,
  };
}

function toUserWithPassword(row: UserRow): UserWithPassword {
  return { ...toUser(row), passwordHash: row.password_hash };
}

const COLUMNS =
  'id, username, display_name, email, password_hash, avatar_color, avatar_image, has_password, created_at';


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
  await execRun(
    `INSERT INTO users
      (id, username, display_name, email, password_hash, avatar_color, avatar_image, has_password, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.username,
      displayName,
      input.email,
      input.passwordHash,
      input.avatarColor,
      null,
      hasPassword ? 1 : 0,
      now,
    ],
  );
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


export async function findUserByLogin(login: string): Promise<UserWithPassword | null> {
  const row = await getRow<UserRow>(
    `SELECT ${COLUMNS} FROM users
     WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [login, login],
  );
  return row ? toUserWithPassword(row) : null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const row = await getRow<UserRow>(
    `SELECT ${COLUMNS} FROM users WHERE LOWER(username) = LOWER(?)`,
    [username],
  );
  return row ? toUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const row = await getRow<UserRow>(
    `SELECT ${COLUMNS} FROM users WHERE LOWER(email) = LOWER(?)`,
    [email],
  );
  return row ? toUser(row) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await getRow<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = ?`, [id]);
  return row ? toUser(row) : null;
}

export async function findUserWithPasswordById(id: string): Promise<UserWithPassword | null> {
  const row = await getRow<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = ?`, [id]);
  return row ? toUserWithPassword(row) : null;
}

export async function updatePassword(id: string, passwordHash: string): Promise<User | null> {
  await execRun(`UPDATE users SET password_hash = ?, has_password = 1 WHERE id = ?`, [
    passwordHash,
    id,
  ]);
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

  const fields: string[] = [];
  const values: Array<string | null> = [];
  if (patch.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(patch.displayName);
  }
  if (patch.username !== undefined) {
    fields.push('username = ?');
    values.push(patch.username);
  }
  if (patch.email !== undefined) {
    fields.push('email = ?');
    values.push(patch.email);
  }
  if (patch.avatarColor !== undefined) {
    fields.push('avatar_color = ?');
    values.push(patch.avatarColor);
  }
  if (patch.avatarImage !== undefined) {
    fields.push('avatar_image = ?');
    values.push(patch.avatarImage);
  }

  if (fields.length > 0) {
    await execRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  }
  return findUserById(id);
}

export async function deleteUserAccount(id: string): Promise<void> {
  await execRun(
    `DELETE FROM events
     WHERE actor_id = ?
        OR wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = ?)`,
    [id, id],
  );
  await execRun('DELETE FROM auth_events WHERE user_id = ?', [id]);
  await execRun('DELETE FROM users WHERE id = ?', [id]);
}

export async function findPublicUserById(id: string): Promise<PublicUser | null> {
  const row = await getRow<Pick<UserRow, 'id' | 'username' | 'avatar_color'>>(
    'SELECT id, username, avatar_color FROM users WHERE id = ?',
    [id],
  );
  return row ? { id: row.id, username: row.username, avatarColor: row.avatar_color } : null;
}
