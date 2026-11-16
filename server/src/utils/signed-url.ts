import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';



const UPLOADS_PREFIX = '/uploads/';

function sign(file: string, exp: number): string {
  return createHmac('sha256', env.jwtSecret).update(`${file}:${exp}`).digest('hex');
}


export function signUploadUrl(url: string): string {
  if (!url.startsWith(UPLOADS_PREFIX)) return url;
  const file = url.slice(UPLOADS_PREFIX.length).split('?')[0];
  if (!file) return url;
  const exp = Math.floor(Date.now() / 1000) + env.uploadsUrlTtlHours * 3600;
  return `${UPLOADS_PREFIX}${file}?exp=${exp}&sig=${sign(file, exp)}`;
}


export function verifyUploadRequest(file: string, exp: string | undefined, sig: string | undefined): boolean {
  if (!exp || !sig) return false;
  const expNumber = Number(exp);
  if (!Number.isFinite(expNumber) || expNumber * 1000 < Date.now()) return false;
  const expected = sign(file, expNumber);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(sig, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
