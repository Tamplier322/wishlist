import type { Request, Response } from 'express';
import { addWorkspace, editWorkspace, listWorkspaces, removeWorkspace } from '../services/workspace.service';
import { asyncHandler, parseBody } from '../utils/controller-helpers';
import { workspaceSchema } from '../utils/validators';

export const listWorkspacesHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await listWorkspaces(req.user!.id));
});

export const createWorkspaceHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(workspaceSchema, req.body);
  const workspace = await addWorkspace(req.user!.id, body);
  res.status(201).json(workspace);
});

export const updateWorkspaceHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = parseBody(workspaceSchema.partial(), req.body);
  const workspace = await editWorkspace(req.user!.id, req.params.id, body);
  res.json(workspace);
});

export const deleteWorkspaceHandler = asyncHandler(async (req: Request, res: Response) => {
  await removeWorkspace(req.user!.id, req.params.id);
  res.json({ ok: true });
});
