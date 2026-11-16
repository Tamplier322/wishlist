import type { Request, Response } from 'express';
import { resolveLink } from '../services/resolve.service';
import { asyncHandler } from '../utils/controller-helpers';
import { badRequest } from '../utils/errors';


export const resolveLinkHandler = asyncHandler(async (req: Request, res: Response) => {
  const url = String(req.query.url ?? '');
  if (!/^https:\/\//.test(url)) {
    throw badRequest('Некорректная ссылка');
  }
  const result = await resolveLink(url);
  res.json(result);
});
