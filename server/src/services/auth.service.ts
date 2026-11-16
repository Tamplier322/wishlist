import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { addMember } from '../repositories/member.repository';
import { createCategory } from '../repositories/category.repository';
import { createWishlist } from '../repositories/wishlist.repository';
import {
  createUser,
  deleteUserAccount,
  findUserByEmail,
  findUserById,
  findUserByLogin,
  findUserByUsername,
  findUserWithPasswordById,
  updatePassword,
  updateUserProfile,
} from '../repositories/user.repository';
import { pickUserColor } from '../utils/colors';
import { badRequest, conflict, unauthorized } from '../utils/errors';
import { signToken } from '../utils/jwt';
import { issueRefreshToken, revokeAllUserTokens } from './refresh-token.service';
import type { User } from '../types/domain';

export interface AuthResult {
  token: string;
  refreshToken: string;
  user: User;
}

export async function issueAuthResult(user: User): Promise<AuthResult> {
  return {
    token: signToken({ sub: user.id, username: user.username }),
    refreshToken: await issueRefreshToken(user.id),
    user,
  };
}


const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Электроника', color: '#5b7185' },
  { name: 'Одежда и обувь', color: '#8f6b8a' },
  { name: 'Бытовая техника', color: '#94806e' },
  { name: 'Хобби и творчество', color: '#a4563f' },
  { name: 'Книги', color: '#c9a06e' },
  { name: 'Спорт', color: '#7c8b6f' },
  { name: 'Другое', color: '#8f8478' },
];

const BCRYPT_ROUNDS = 12;

let dummyHashPromise: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash(randomBytes(24).toString('hex'), BCRYPT_ROUNDS);
  }
  return dummyHashPromise;
}

export async function seedDefaultContent(user: User): Promise<void> {
  await Promise.all(
    DEFAULT_CATEGORIES.map((category, index) =>
      createCategory({
        ownerId: user.id,
        name: category.name,
        color: category.color,
        position: index,
      }),
    ),
  );

  const wishlist = await createWishlist({
    ownerId: user.id,
    name: 'Мой вишлист',
    description: 'Личный список желаний',
  });
  await addMember(
    { wishlistId: wishlist.id, userId: user.id, color: user.avatarColor, role: 'owner' },
    user,
  );
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  if (await findUserByUsername(input.username)) throw conflict('Имя пользователя уже занято');
  if (await findUserByEmail(input.email)) throw conflict('Email уже зарегистрирован');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await createUser({
    username: input.username,
    email: input.email,
    passwordHash,
    avatarColor: pickUserColor(),
  });
  await seedDefaultContent(user);

  return issueAuthResult(user);
}

export async function login(input: { login: string; password: string }): Promise<AuthResult> {
  const found = await findUserByLogin(input.login);
  if (!found) {
    await bcrypt.compare(input.password, await dummyHash());
    throw unauthorized('Неверный логин или пароль');
  }

  const passwordOk = await bcrypt.compare(input.password, found.passwordHash);
  if (!passwordOk) throw unauthorized('Неверный логин или пароль');

  const user: User = {
    id: found.id,
    username: found.username,
    displayName: found.displayName,
    email: found.email,
    avatarColor: found.avatarColor,
    avatarImage: found.avatarImage,
    hasPassword: found.hasPassword,
    createdAt: found.createdAt,
  };
  return issueAuthResult(user);
}


export async function setPassword(
  userId: string,
  input: { currentPassword?: string; newPassword: string },
): Promise<AuthResult> {
  const existing = await findUserWithPasswordById(userId);
  if (!existing) throw unauthorized('Пользователь не найден');

  if (existing.hasPassword) {
    if (!input.currentPassword) throw badRequest('Введите текущий пароль');
    const ok = await bcrypt.compare(input.currentPassword, existing.passwordHash);
    if (!ok) throw unauthorized('Неверный текущий пароль');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  const updated = await updatePassword(userId, passwordHash);
  if (!updated) throw unauthorized('Пользователь не найден');

  await revokeAllUserTokens(userId);
  return issueAuthResult(updated);
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ProfilePatch {
  displayName?: string;
  username?: string;
  email?: string;
  avatarColor?: string;
  avatarImage?: string | null;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<User> {
  const existing = await findUserById(userId);
  if (!existing) throw unauthorized('Пользователь не найден');

  const normalized: ProfilePatch = { ...patch };

  if (patch.displayName !== undefined) {
    const displayName = patch.displayName.trim();
    if (displayName.length < 2 || displayName.length > 40) {
      throw badRequest('Имя: от 2 до 40 символов');
    }
    normalized.displayName = displayName;
  }

  if (patch.username !== undefined) {
    const username = patch.username.trim();
    if (username.length < 3 || username.length > 24 || !USERNAME_PATTERN.test(username)) {
      throw badRequest('Логин: 3–24 символа, латиница, цифры и _ . -');
    }
    if (username.toLowerCase() !== existing.username.toLowerCase()) {
      const taken = await findUserByUsername(username);
      if (taken && taken.id !== userId) throw conflict('Этот логин уже занят');
    }
    normalized.username = username;
  }

  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw badRequest('Некорректный email');
    if (email !== existing.email.toLowerCase()) {
      const taken = await findUserByEmail(email);
      if (taken && taken.id !== userId) throw conflict('Этот email уже используется');
    }
    normalized.email = email;
  }

  if (patch.avatarColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(patch.avatarColor)) {
    throw conflict('Цвет в формате #RRGGBB');
  }

  const user = await updateUserProfile(userId, normalized);
  if (!user) throw unauthorized('Пользователь не найден');
  return user;
}

export async function deleteAccount(
  userId: string,
  input: { password?: string; confirm?: string },
): Promise<void> {
  const existing = await findUserWithPasswordById(userId);
  if (!existing) throw unauthorized('Пользователь не найден');

  if (existing.hasPassword) {
    if (!input.password) throw badRequest('Введите пароль для подтверждения');
    const ok = await bcrypt.compare(input.password, existing.passwordHash);
    if (!ok) throw unauthorized('Неверный пароль');
  } else {
    const confirm = (input.confirm ?? '').trim().toLowerCase();
    if (!confirm || confirm !== existing.username.toLowerCase()) {
      throw badRequest('Введите логин для подтверждения удаления');
    }
  }

  await revokeAllUserTokens(userId);
  await deleteUserAccount(userId);
}
