import type { Request, Response } from 'express';
import {
  createWishlistForUser,
  editWishlist,
  getSharedWishlist,
  getWishlistContent,
  listWishlists,
  removeMemberFromWishlist,
  removeWishlist,
  setWishlistShared,
} from '../services/wishlist.service';
import { badRequest } from '../utils/errors';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { wishlistPatchSchema, wishlistSchema } from '../utils/validators';

export const listWishlistsHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listWishlists(req.user!.id));
});

export const createWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(wishlistSchema, req.body);
  const wishlist = await createWishlistForUser(req.user!.id, body);
  res.status(201).json(wishlist);
});

export const getWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getWishlistContent(req.params.id, req.user!.id));
});

export const updateWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(wishlistPatchSchema, req.body);
  const wishlistId = req.params.id;
  const userId = req.user!.id;

  let updated = null;
  if (body.isShared !== undefined) {
    updated = await setWishlistShared(wishlistId, userId, body.isShared);
  }
  if (body.name !== undefined || body.description !== undefined) {
    updated = await editWishlist(wishlistId, userId, { name: body.name, description: body.description });
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


export const getSharedWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getSharedWishlist(req.params.slug));
});
