import { z } from 'zod';
import { WISH_KINDS } from '../types/domain';

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyui',
  'qwerty12',
  'iloveyou',
  'admin123',
  'welcome1',
  'letmein1',
  'abc12345',
  '11111111',
]);



const passwordSchema = z
  .string()
  .min(8, 'Пароль: минимум 8 символов')
  .max(72, 'Пароль слишком длинный')
  .refine((value) => /[a-zA-Zа-яА-Я]/.test(value) && /\d/.test(value), {
    message: 'Пароль должен содержать буквы и цифры',
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: 'Этот пароль слишком распространён',
  });

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Имя: минимум 3 символа')
    .max(24, 'Имя: максимум 24 символа')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Имя: только латиница, цифры и _ . -'),
  email: z.string().trim().email('Некорректный email'),
  password: passwordSchema,
});

export const setPasswordSchema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: passwordSchema,
});

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Укажите логин'),
  password: z.string().min(1, 'Укажите пароль'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(10, 'Некорректный refresh-токен').max(200),
});

const optionalString = z.string().trim().max(2000).optional();

const safeLink = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value === '' || /^https?:\/\//i.test(value), {
    message: 'Ссылка должна начинаться с http:// или https://',
  })
  .optional();

const safeImageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => value === '' || /^https:\/\//i.test(value) || /^\/uploads\//.test(value),
    { message: 'Картинка должна быть https-ссылкой или загруженным файлом' },
  )
  .optional();

export const itemSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(120, 'Название слишком длинное'),
  description: optionalString,
  link: safeLink,
  imageUrl: safeImageUrl,
  categoryId: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  kind: z.enum(['game', 'skin', 'book', 'app', 'tech', 'other']).optional(),
  status: z.enum(['wanted', 'reserved', 'purchased']).optional(),
});

export const itemPatchSchema = itemSchema.partial();

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(40, 'Название слишком длинное'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB'),
});

export const categoryPatchSchema = categorySchema.partial();

export const wishlistSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(60, 'Название слишком длинное'),
  description: z.string().trim().max(300).optional(),
  workspaceId: z.string().nullable().optional(),
});

export const wishlistPatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  isShared: z.boolean().optional(),
  surpriseMode: z.boolean().optional(),

  deadline: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional(),
});

export const memberRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

export const inviteSchema = z.object({
  username: z.string().trim().min(1, 'Укажите имя пользователя'),
});

export const joinInviteSchema = z.object({
  code: z.string().trim().min(6, 'Некорректный код приглашения').max(40),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, 'Пустой комментарий').max(500),
  hideFromAuthor: z.boolean().optional(),
});

export const deadlinePatchSchema = z.object({
  deadline: z.string().nullable(),
});


export const profilePatchSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Имя: минимум 2 символа')
    .max(40, 'Имя: максимум 40 символов')
    .optional(),
  username: z
    .string()
    .trim()
    .min(3, 'Логин: минимум 3 символа')
    .max(24, 'Логин: максимум 24 символа')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Логин: только латиница, цифры и _ . -')
    .optional(),
  email: z.string().trim().email('Некорректный email').optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB')
    .optional(),
  avatarImage: z
    .string()
    .trim()
    .max(2000, 'Слишком длинная ссылка')
    .refine(
      (value) =>
        value === '' ||
        value === 'null' ||
        /^https:\/\//i.test(value) ||
        /^\/uploads\//.test(value),
      { message: 'Некорректная ссылка на картинку' },
    )
    .nullable()
    .optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().max(200).optional(),
  confirm: z.string().trim().max(100).optional(),
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(40, 'Максимум 40 символов'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB'),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const offersSearchSchema = z.object({
  query: z.string().trim().min(1, 'Укажите поисковый запрос').max(120),
  kind: z.enum(WISH_KINDS as unknown as [string, ...string[]]),
});

export const bestPriceQuerySchema = offersSearchSchema;

export const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1, 'Пустой порядок'),
});


export const oauthExchangeSchema = z.object({
  code: z.string().trim().min(10, 'Некорректный код').max(200),
});

export const telegramAuthSchema = z.object({
  id: z.string().regex(/^\d{1,20}$/, 'Некорректный Telegram ID'),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().max(100).optional(),
  username: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/, 'Некорректный Telegram username')
    .optional(),
  photo_url: z.string().url().max(2000).optional(),
  auth_date: z.string().regex(/^\d{1,12}$/, 'Некорректная дата'),
  hash: z.string().regex(/^[0-9a-fA-F]{64}$/, 'Некорректная подпись'),
});
