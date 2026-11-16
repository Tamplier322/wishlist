import { execRun, getRow } from '../../config/database';
import { createId } from '../../utils/ids';
import type { PublicUser, User } from '../../types/domain';

export interface UserWithPassword extends User {
  passwordHash: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  avatar_image: string | null;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarColor: row.avatar_color,
    avatarImage: row.avatar_image,
    createdAt: row.created_at,
  };
}

function toUserWithPassword(row: UserRow): UserWithPassword {
  return { ...toUser(row), passwordHash: row.password_hash };
}

const COLUMNS = 'id, username, email, password_hash, avatar_color, avatar_image, created_at';


export async function createUser(input: {
  username: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
}): Promise<User> {
  const id = createId();
  const now = new Date().toISOString();
  await execRun(
    `INSERT INTO users (id, username, email, password_hash, avatar_color, avatar_image, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.username, input.email, input.passwordHash, input.avatarColor, null, now],
  );
  return {
    id,
    username: input.username,
    email: input.email,
    avatarColor: input.avatarColor,
    avatarImage: null,
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

export async function updateUserProfile(
  id: string,
  patch: { avatarColor?: string; avatarImage?: string | null },
): Promise<User | null> {
  const existing = await findUserById(id);
  if (!existing) return null;
  const avatarColor = patch.avatarColor ?? existing.avatarColor;
  const avatarImage = patch.avatarImage !== undefined ? patch.avatarImage : existing.avatarImage;
  await execRun(`UPDATE users SET avatar_color = ?, avatar_image = ? WHERE id = ?`, [
    avatarColor,
    avatarImage,
    id,
  ]);
  return findUserById(id);
}

export async function findPublicUserById(id: string): Promise<PublicUser | null> {
  const row = await getRow<Pick<UserRow, 'id' | 'username' | 'avatar_color'>>(
    'SELECT id, username, avatar_color FROM users WHERE id = ?',
    [id],
  );
  return row ? { id: row.id, username: row.username, avatarColor: row.avatar_color } : null;
}
