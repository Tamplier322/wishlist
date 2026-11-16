import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { env } from './env';

const UPLOADS_DIR = path.isAbsolute(env.uploadsDir)
  ? env.uploadsDir
  : path.resolve(__dirname, '..', '..', env.uploadsDir);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_SIZE_MB = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${randomUUID()}${ext}`);
  },
});


export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Разрешены только изображения (png, jpeg, webp, gif)'));
  },
});

export function uploadsStaticPath(): string {
  return UPLOADS_DIR;
}

export function isSupportedImage(header: Buffer): boolean {
  if (header.length < 12) return false;

  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const ascii = (start: number, end: number): string => header.subarray(start, end).toString('ascii');
  const isGif = ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a';
  const isWebp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';

  return isPng || isJpeg || isGif || isWebp;
}
