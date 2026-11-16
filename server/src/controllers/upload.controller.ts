import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/controller-helpers';
import { badRequest } from '../utils/errors';


export const uploadImageHandler = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw badRequest('Файл не получен');
  res.status(201).json({ url: `/uploads/${file.filename}` });
});
