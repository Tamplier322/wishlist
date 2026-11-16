import bcrypt from 'bcryptjs';
import { addMember } from '../repositories/member.repository';
import { createCategory } from '../repositories/category.repository';
import { createWishlist } from '../repositories/wishlist.repository';
import {
  createUser,
  findUserByEmail,
  findUserByLogin,
  findUserByUsername,
  updateUserProfile,
} from '../repositories/user.repository';
import { pickUserColor } from '../utils/colors';
import { conflict, unauthorized } from '../utils/errors';
import { signToken } from '../utils/jwt';
import type { User } from '../types/domain';

export interface AuthResult {
  token: string;
  user: User;
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

const BCRYPT_ROUNDS = 10;


async function seedDefaultContent(user: User): Promise<void> {
  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await createCategory({
      ownerId: user.id,
      name: category.name,
      color: category.color,
      position: index,
    });
  }

  const wishlist = await createWishlist({
    ownerId: user.id,
    name: 'Мой вишлист',
    description: 'Личный список желаний',
  });
  await addMember({ wishlistId: wishlist.id, userId: user.id, color: user.avatarColor, role: 'owner' });
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

  return { token: signToken({ sub: user.id, username: user.username }), user };
}

export async function login(input: { login: string; password: string }): Promise<AuthResult> {
  const found = await findUserByLogin(input.login);
  if (!found) throw unauthorized('Неверный логин или пароль');

  const passwordOk = await bcrypt.compare(input.password, found.passwordHash);
  if (!passwordOk) throw unauthorized('Неверный логин или пароль');

  const user: User = {
    id: found.id,
    username: found.username,
    email: found.email,
    avatarColor: found.avatarColor,
    avatarImage: found.avatarImage,
    createdAt: found.createdAt,
  };
  return { token: signToken({ sub: user.id, username: user.username }), user };
}


export async function updateProfile(
  userId: string,
  patch: { avatarColor?: string; avatarImage?: string | null },
): Promise<User> {
  if (patch.avatarColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(patch.avatarColor)) {
    throw conflict('Цвет в формате #RRGGBB');
  }
  const user = await updateUserProfile(userId, patch);
  if (!user) throw unauthorized('Пользователь не найден');
  return user;
}
