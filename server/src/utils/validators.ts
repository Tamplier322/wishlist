import { z } from 'zod';
import { WISH_KINDS } from '../types/domain';



export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Имя: минимум 3 символа')
    .max(24, 'Имя: максимум 24 символа')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Имя: только латиница, цифры и _ . -'),
  email: z.string().trim().email('Некорректный email'),
  password: z.string().min(6, 'Пароль: минимум 6 символов').max(72, 'Пароль слишком длинный'),
});

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Укажите логин'),
  password: z.string().min(1, 'Укажите пароль'),
});

const optionalString = z.string().trim().max(2000).optional();

export const itemSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(120, 'Название слишком длинное'),
  description: optionalString,
  link: optionalString,
  imageUrl: optionalString,
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

  deadline: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional(),
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
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB')
    .optional(),
  avatarImage: z
    .string()
    .trim()
    .max(2000, 'Слишком длинная ссылка')
    .refine((value) => value === '' || value === 'null' || /^https?:\/\/|^\//.test(value), {
      message: 'Некорректная ссылка на картинку',
    })
    .nullable()
    .optional(),
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
