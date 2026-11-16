import type { Request, Response } from 'express';
import { getVapidPublicKey, subscribe, unsubscribe } from '../services/push.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { pushSubscribeSchema } from '../utils/validators';


export const vapidKeyHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ publicKey: getVapidPublicKey() });
});

export const subscribePushHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(pushSubscribeSchema, req.body);
  await subscribe(req.user!.id, body);
  res.json({ ok: true });
});

export const unsubscribePushHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(pushSubscribeSchema, req.body);
  await unsubscribe(body.endpoint);
  res.json({ ok: true });
});
