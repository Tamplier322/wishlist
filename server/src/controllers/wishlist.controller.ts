import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import {
  createWishlistForUser,
  editWishlist,
  getSharedWishlist,
  getWishlistContent,
  listWishlists,
  removeMemberFromWishlist,
  removeWishlist,
  setMemberRole,
  setWishlistShared,
} from '../services/wishlist.service';
import { buildWishlistIcs } from '../services/calendar.service';
import { findWishlistBySlug } from '../repositories/wishlist.repository';
import { badRequest, notFound, unauthorized } from '../utils/errors';
import { verifyToken } from '../utils/jwt';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { sendJsonWithEtag } from '../utils/etag';
import { memberRoleSchema, wishlistPatchSchema, wishlistSchema } from '../utils/validators';

export const listWishlistsHandler = asyncHandler(async (req: Request, res: Response) => {
  sendJsonWithEtag(req, res, await listWishlists(req.user!.id));
});

export const createWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(wishlistSchema, req.body);
  const wishlist = await createWishlistForUser(req.user!.id, body);
  res.status(201).json(wishlist);
});

export const getWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  sendJsonWithEtag(req, res, await getWishlistContent(req.params.id, req.user!.id));
});

export const updateWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(wishlistPatchSchema, req.body);
  const wishlistId = req.params.id;
  const userId = req.user!.id;

  let updated = null;
  if (body.isShared !== undefined) {
    updated = await setWishlistShared(wishlistId, userId, body.isShared);
  }
  if (
    body.name !== undefined ||
    body.description !== undefined ||
    body.surpriseMode !== undefined
  ) {
    updated = await editWishlist(wishlistId, userId, {
      name: body.name,
      description: body.description,
      surpriseMode: body.surpriseMode,
    });
  }
  if (!updated) throw badRequest('Нет полей для обновления');
  res.json(updated);
});

export const deleteWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  await removeWishlist(req.params.id, req.user!.id);
  res.json({ ok: true });
});

export const removeMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  await removeMemberFromWishlist(req.params.id, req.user!.id, req.params.userId);
  res.json({ ok: true });
});

export const setMemberRoleHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(memberRoleSchema, req.body);
  await setMemberRole(req.params.id, req.user!.id, req.params.userId, body.role);
  res.json({ ok: true });
});

export const wishlistIcsHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = String(req.query.token ?? '');
  let userId: string;
  try {
    userId = verifyToken(token).sub;
  } catch {
    throw unauthorized('Требуется авторизация');
  }

  const ics = await buildWishlistIcs(req.params.id, userId);
  if (!ics) throw badRequest('У списка не задан дедлайн');

  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="wishlist-${req.params.id}.ics"`);
  res.send(ics);
});

export const wishlistQrHandler = asyncHandler(async (req: Request, res: Response) => {
  const wishlist = await findWishlistBySlug(req.params.slug);
  if (!wishlist || !wishlist.shareSlug) throw notFound('Список не найден или доступ закрыт');

  const url = `${req.protocol}://${req.get('host')}/s/${wishlist.shareSlug}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 240 });
  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});


export const getSharedWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  sendJsonWithEtag(req, res, await getSharedWishlist(req.params.slug));
});
