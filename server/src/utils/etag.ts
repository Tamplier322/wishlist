import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

export function sendJsonWithEtag(req: Request, res: Response, data: unknown): void {
  const body = JSON.stringify(data);
  const etag = `W/"${createHash('sha1').update(body).digest('base64url')}"`;

  const ifNoneMatch = req.headers['if-none-match'];
  if (typeof ifNoneMatch === 'string' && ifNoneMatch.split(',').map((part) => part.trim()).includes(etag)) {
    res.status(304).end();
    return;
  }

  res.set('ETag', etag);
  res.set('Cache-Control', 'private, no-cache');
  res.type('application/json').send(body);
}
