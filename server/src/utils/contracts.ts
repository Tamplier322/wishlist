import { z } from 'zod';

export const publicUserContract = z.object({
  id: z.string(),
  username: z.string(),
  avatarColor: z.string(),
  avatarImage: z.string().optional(),
});

export const wishItemContract = z.object({
  id: z.string(),
  wishlistId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorColor: z.string(),
  categoryId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  link: z.string(),
  imageUrl: z.string(),
  price: z.number().nullable(),
  currency: z.string().length(3),
  priority: z.enum(['low', 'medium', 'high']),
  kind: z.enum(['game', 'skin', 'book', 'app', 'tech', 'other']),
  status: z.enum(['wanted', 'reserved', 'purchased']),
  reservedBy: z.string().nullable(),
  reservedByName: z.string().nullable(),
  reservedByColor: z.string().nullable(),
  reservedUntil: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const trashItemContract = wishItemContract.extend({
  deletedAt: z.string(),
});

export const eventContract = z.object({
  id: z.string(),
  wishlistId: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.enum([
    'item-added',
    'item-updated',
    'item-removed',
    'item-restored',
    'item-purged',
    'wishlist-updated',
    'member-removed',
    'category-changed',
  ]),
  targetId: z.string().nullable(),
  title: z.string().nullable(),
  detail: z.string().nullable(),
  createdAt: z.string(),
});

export const wishlistContract = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  isShared: z.boolean(),
  shareSlug: z.string().nullable(),
  inviteCode: z.string().nullable(),
  deadline: z.string().nullable(),
  surpriseMode: z.boolean(),
  workspaceId: z.string().nullable(),
  createdAt: z.string(),
});

export const categoryContract = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  color: z.string(),
  position: z.number(),
});

export const offerContract = z.object({
  id: z.string(),
  provider: z.string(),
  title: z.string(),
  price: z.number().nullable(),
  currency: z.string(),
  shipping: z.number().nullable().optional(),
  totalPrice: z.number().nullable().optional(),
  rating: z.number().nullable(),
  ratingSource: z.string().nullable(),
  extra: z.string().nullable(),
  imageUrl: z.string().nullable(),
  url: z.string(),
  exact: z.boolean().optional(),
  matchScore: z.number().optional(),
  relevanceScore: z.number().optional(),
});

export const offersResultContract = z.object({
  query: z.string(),
  kind: z.enum(['game', 'skin', 'book', 'app', 'tech', 'other']),
  offers: z.array(offerContract),
  searchLinks: z.array(z.object({ name: z.string(), url: z.string() })),
  providersUsed: z.array(z.string()),
  bestPrice: z
    .object({
      price: z.number(),
      currency: z.string(),
      provider: z.string(),
      exact: z.boolean(),
      shipping: z.number().nullable().optional(),
      totalPrice: z.number().nullable().optional(),
    })
    .nullable(),
});

export const userContract = publicUserContract.extend({
  displayName: z.string(),
  email: z.string(),
  avatarImage: z.string().nullable(),
  hasPassword: z.boolean(),
  createdAt: z.string(),
});

export const oauthAccountContract = z.object({
  provider: z.enum(['google', 'telegram']),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export const oauthAccountsContract = z.object({
  accounts: z.array(oauthAccountContract),
  hasPassword: z.boolean(),
  available: z.object({
    google: z.boolean(),
    telegram: z.object({
      enabled: z.boolean(),
      botUsername: z.string().nullable(),
      botId: z.string().nullable(),
    }),
  }),
});

export const authEventContract = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  event: z.enum(['login', 'login_failed', 'oauth_login', 'password_set', 'token_reuse']),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

export const authEventsContract = z.object({
  events: z.array(authEventContract),
});

export const authResultContract = z.object({
  token: z.string().min(10),
  refreshToken: z.string().min(10).optional(),
  user: publicUserContract.extend({
    email: z.string().optional(),
    createdAt: z.string().optional(),
  }),
});

export const wishlistContentContract = z.object({
  wishlist: wishlistContract,
  members: z.array(
    z.object({
      id: z.string(),
      wishlistId: z.string(),
      userId: z.string(),
      role: z.enum(['owner', 'editor', 'viewer', 'member']),
      color: z.string(),
      joinedAt: z.string(),
      user: publicUserContract,
    }),
  ),
  categories: z.array(categoryContract),
  items: z.array(wishItemContract),
  inviteCode: z.string().nullable().optional(),
});

export type WishItemContract = z.infer<typeof wishItemContract>;
export type OffersResultContract = z.infer<typeof offersResultContract>;
export type TrashItemContract = z.infer<typeof trashItemContract>;
export type EventContract = z.infer<typeof eventContract>;
export type UserContract = z.infer<typeof userContract>;
export type OAuthAccountContract = z.infer<typeof oauthAccountContract>;
export type OAuthAccountsContract = z.infer<typeof oauthAccountsContract>;
