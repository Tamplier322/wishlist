import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { isSupportedImage, uploadsStaticPath } from '../config/uploads';
import { asyncHandler } from '../utils/controller-helpers';
import { badRequest } from '../utils/errors';


export const uploadImageHandler = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw badRequest('Файл не получен');

  const filePath = path.join(uploadsStaticPath(), file.filename);
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (!isSupportedImage(header)) {
    fs.rmSync(filePath, { force: true });
    throw badRequest('Файл не является изображением (png, jpeg, webp, gif)');
  }

  res.status(201).json({ url: `/uploads/${file.filename}` });
});
