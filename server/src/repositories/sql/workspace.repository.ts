import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { Workspace } from '../../types/domain';

interface WorkspaceRow {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  created_at: string;
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

const COLUMNS = 'id, owner_id, name, color, created_at';

export async function createWorkspace(input: {
  ownerId: string;
  name: string;
  color: string;
}): Promise<Workspace> {
  const id = createId();
  const now = new Date().toISOString();
  await execRun(
    `INSERT INTO workspaces (id, owner_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, input.ownerId, input.name, input.color, now],
  );
  return { id, ownerId: input.ownerId, name: input.name, color: input.color, createdAt: now };
}

export async function findWorkspacesByOwner(ownerId: string): Promise<Workspace[]> {
  const rows = await getRows<WorkspaceRow>(
    `SELECT ${COLUMNS} FROM workspaces WHERE owner_id = ? ORDER BY created_at`,
    [ownerId],
  );
  return rows.map(toWorkspace);
}

export async function findWorkspaceById(id: string): Promise<Workspace | null> {
  const row = await getRow<WorkspaceRow>(`SELECT ${COLUMNS} FROM workspaces WHERE id = ?`, [id]);
  return row ? toWorkspace(row) : null;
}

export async function updateWorkspace(
  id: string,
  patch: { name?: string; color?: string },
): Promise<Workspace | null> {
  const existing = await findWorkspaceById(id);
  if (!existing) return null;
  const name = patch.name ?? existing.name;
  const color = patch.color ?? existing.color;
  await execRun(`UPDATE workspaces SET name = ?, color = ? WHERE id = ?`, [name, color, id]);
  return { ...existing, name, color };
}


export async function deleteWorkspace(id: string): Promise<void> {
  await execRun(`UPDATE wishlists SET workspace_id = NULL WHERE workspace_id = ?`, [id]);
  await execRun(`DELETE FROM workspaces WHERE id = ?`, [id]);
}

export async function assignListToWorkspace(wishlistId: string, workspaceId: string | null): Promise<void> {
  await execRun(`UPDATE wishlists SET workspace_id = ? WHERE id = ?`, [workspaceId, wishlistId]);
}
