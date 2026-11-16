import {
  createWorkspace,
  deleteWorkspace,
  findWorkspaceById,
  findWorkspacesByOwner,
  updateWorkspace,
} from '../repositories/workspace.repository';
import type { Workspace } from '../types/domain';
import { badRequest, forbidden, notFound } from '../utils/errors';

const MAX_NAME = 40;

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  return findWorkspacesByOwner(userId);
}

export async function addWorkspace(
  userId: string,
  input: { name: string; color: string },
): Promise<Workspace> {
  const name = input.name.trim();
  if (!name) throw badRequest('Название пространства не может быть пустым');
  if (name.length > MAX_NAME) throw badRequest(`Максимум ${MAX_NAME} символов`);
  return createWorkspace({ ownerId: userId, name, color: input.color });
}

export async function editWorkspace(
  userId: string,
  workspaceId: string,
  patch: { name?: string; color?: string },
): Promise<Workspace> {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) throw notFound('Пространство не найдено');
  if (workspace.ownerId !== userId) throw forbidden('Это не ваше пространство');
  const updated = await updateWorkspace(workspaceId, patch);
  if (!updated) throw notFound('Пространство не найдено');
  return updated;
}


export async function removeWorkspace(userId: string, workspaceId: string): Promise<void> {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) throw notFound('Пространство не найдено');
  if (workspace.ownerId !== userId) throw forbidden('Это не ваше пространство');
  await deleteWorkspace(workspaceId);
}
