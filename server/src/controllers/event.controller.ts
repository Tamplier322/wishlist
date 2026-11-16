import type { Request, Response } from 'express';
import { listEvents } from '../services/event.service';
import { asyncHandler } from '../utils/controller-helpers';
import { sendJsonWithEtag } from '../utils/etag';

export const listHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawLimit = Number(req.query.limit ?? 50);
  const events = await listEvents(req.params.id, req.user!.id, rawLimit);
  sendJsonWithEtag(req, res, events);
});
