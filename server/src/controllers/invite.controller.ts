import type { Request, Response } from 'express';
import {
  getInviteInfo,
  joinByInviteCode,
  listIncoming,
  respondToInvite,
  sendInvite,
} from '../services/invite.service';
import { badRequest } from '../utils/errors';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { inviteSchema, joinInviteSchema } from '../utils/validators';

export const sendInviteHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(inviteSchema, req.body);
  const invite = await sendInvite(req.params.id, req.user!.id, body.username);
  res.status(201).json(invite);
});

export const listInvitesHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listIncoming(req.user!.id));
});

export const respondInviteHandler = asyncHandler(async (req: Request, res: Response) => {
  const accept = req.body?.accept;
  if (typeof accept !== 'boolean') throw badRequest('Поле accept (boolean) обязательно');
  const invite = await respondToInvite(req.params.id, req.user!.id, accept);
  res.json(invite);
});


export const getInviteInfoHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getInviteInfo(req.params.code));
});


export const joinByInviteHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(joinInviteSchema, req.body);
  const result = await joinByInviteCode(req.user!.id, body.code);
  res.json(result);
});
