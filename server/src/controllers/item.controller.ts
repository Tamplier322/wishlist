import type { Request, Response } from 'express';
import { addItem, editItem, listItems, removeItem, reorderItems } from '../services/item.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { itemPatchSchema, itemSchema, reorderSchema } from '../utils/validators';

export const listItemsHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listItems(req.params.id, req.user!.id));
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

export const reorderItemsHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(reorderSchema, req.body);
  await reorderItems(req.params.id, req.user!.id, body.order);
  res.json({ ok: true });
});
