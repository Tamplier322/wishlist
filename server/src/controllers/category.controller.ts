import type { Request, Response } from 'express';
import { addCategory, editCategory, listCategories, removeCategory } from '../services/category.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { categoryPatchSchema, categorySchema } from '../utils/validators';

export const listCategoriesHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listCategories(req.user!.id));
});

export const createCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(categorySchema, req.body);
  const category = await addCategory(req.user!.id, body);
  res.status(201).json(category);
});

export const updateCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(categoryPatchSchema, req.body);
  const category = await editCategory(req.user!.id, req.params.id, body);
  res.json(category);
});

export const deleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  await removeCategory(req.user!.id, req.params.id);
  res.json({ ok: true });
});
