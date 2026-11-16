import {
  createCategory,
  deleteCategory,
  findCategoriesByOwner,
  findCategoryById,
  updateCategory,
} from '../repositories/category.repository';
import type { Category } from '../types/domain';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';

export interface CategoryInput {
  name: string;
  color: string;
}

export async function listCategories(ownerId: string): Promise<Category[]> {
  return findCategoriesByOwner(ownerId);
}

export async function addCategory(ownerId: string, input: CategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw badRequest('Название категории не может быть пустым');

  const existing = await findCategoriesByOwner(ownerId);
  if (existing.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    throw conflict('Категория с таким названием уже существует');
  }

  return createCategory({
    ownerId,
    name,
    color: input.color,
    position: existing.length,
  });
}

export async function editCategory(
  ownerId: string,
  categoryId: string,
  patch: Partial<CategoryInput>,
): Promise<Category> {
  const category = await requireOwnedCategory(ownerId, categoryId);
  const updated = await updateCategory(category.id, { name: patch.name, color: patch.color });
  if (!updated) throw notFound('Категория не найдена');
  return updated;
}

export async function removeCategory(ownerId: string, categoryId: string): Promise<void> {
  const category = await requireOwnedCategory(ownerId, categoryId);

  await deleteCategory(category.id);
}

async function requireOwnedCategory(ownerId: string, categoryId: string): Promise<Category> {
  const category = await findCategoryById(categoryId);
  if (!category) throw notFound('Категория не найдена');
  if (category.ownerId !== ownerId) throw forbidden('Это не ваша категория');
  return category;
}
