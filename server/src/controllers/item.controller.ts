import type { Request, Response } from 'express';
import {
  addItem,
  editItem,
  listItems,
  listTrash,
  purgeItem,
  removeItem,
  reorderItems,
  restoreItem,
} from '../services/item.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { sendJsonWithEtag } from '../utils/etag';
import { readPageQuery, setPageHeaders, sliceByCursor } from '../utils/pagination';
import { itemPatchSchema, itemSchema, reorderSchema } from '../utils/validators';

export const listItemsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = readPageQuery(req);
  const rows = await listItems(req.params.id, req.user!.id);
  const result = sliceByCursor(rows, page);
  setPageHeaders(res, result, page);
  sendJsonWithEtag(req, res, result.items);
});

export const createItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(itemSchema, req.body);
  const item = await addItem(req.params.id, req.user!.id, body);
  res.status(201).json(item);
});

export const updateItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(itemPatchSchema, req.body);
  const item = await editItem(req.params.id, req.user!.id, body);
  res.json(item);
});

export const deleteItemHandler = asyncHandler(async (req: Request, res: Response) => {
  await removeItem(req.params.id, req.user!.id);
  res.json({ ok: true });
});

export const listTrashHandler = asyncHandler(async (req: Request, res: Response) => {
  const rows = await listTrash(req.params.id, req.user!.id);
  sendJsonWithEtag(req, res, rows);
});

export const restoreItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const item = await restoreItem(req.params.itemId, req.user!.id);
  res.json(item);
});

export const purgeItemHandler = asyncHandler(async (req: Request, res: Response) => {
  await purgeItem(req.params.itemId, req.user!.id);
  res.json({ ok: true });
});

export const reorderItemsHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(reorderSchema, req.body);
  await reorderItems(req.params.id, req.user!.id, body.order);
  res.json({ ok: true });
});
