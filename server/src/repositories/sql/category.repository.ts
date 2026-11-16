import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { Category } from '../../types/domain';

interface CategoryRow {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  position: number;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    color: row.color,
    position: row.position,
  };
}

const COLUMNS = 'id, owner_id, name, color, position';

export async function createCategory(input: {
  ownerId: string;
  name: string;
  color: string;
  position: number;
}): Promise<Category> {
  const id = createId();
  await execRun(`INSERT INTO categories (id, owner_id, name, color, position) VALUES (?, ?, ?, ?, ?)`, [
    id,
    input.ownerId,
    input.name,
    input.color,
    input.position,
  ]);
  return { id, ownerId: input.ownerId, name: input.name, color: input.color, position: input.position };
}

export async function findCategoriesByOwner(ownerId: string): Promise<Category[]> {
  const rows = await getRows<CategoryRow>(
    `SELECT ${COLUMNS} FROM categories WHERE owner_id = ? ORDER BY position, name`,
    [ownerId],
  );
  return rows.map(toCategory);
}

export async function findCategoryById(id: string): Promise<Category | null> {
  const row = await getRow<CategoryRow>(`SELECT ${COLUMNS} FROM categories WHERE id = ?`, [id]);
  return row ? toCategory(row) : null;
}

export async function updateCategory(
  id: string,
  patch: { name?: string; color?: string },
): Promise<Category | null> {
  const existing = await findCategoryById(id);
  if (!existing) return null;
  const name = patch.name ?? existing.name;
  const color = patch.color ?? existing.color;
  await execRun(`UPDATE categories SET name = ?, color = ? WHERE id = ?`, [name, color, id]);
  return { ...existing, name, color };
}

export async function deleteCategory(id: string): Promise<boolean> {
  await execRun(`DELETE FROM categories WHERE id = ?`, [id]);
  return true;
}
