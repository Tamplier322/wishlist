import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import type { Category } from '../../types/domain';

interface CategoryDoc {
  ownerId: string;
  name: string;
  color: string;
  position: number;
}

function toCategory(id: string, data: CategoryDoc): Category {
  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    color: data.color,
    position: Number(data.position ?? 0),
  };
}

export async function createCategory(input: {
  ownerId: string;
  name: string;
  color: string;
  position: number;
}): Promise<Category> {
  const id = createId();
  const doc: CategoryDoc = {
    ownerId: input.ownerId,
    name: input.name,
    color: input.color,
    position: input.position,
  };
  await firestore().collection(COLLECTIONS.categories).doc(id).set(doc);
  return toCategory(id, doc);
}

export async function findCategoriesByOwner(ownerId: string): Promise<Category[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.categories)
    .where('ownerId', '==', ownerId)
    .get();
  return snapshot.docs
    .map((doc) => toCategory(doc.id, doc.data() as CategoryDoc))
    .sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
}

export async function findCategoryById(id: string): Promise<Category | null> {
  const snapshot = await firestore().collection(COLLECTIONS.categories).doc(id).get();
  if (!snapshot.exists) return null;
  return toCategory(id, snapshot.data() as CategoryDoc);
}

export async function updateCategory(
  id: string,
  patch: { name?: string; color?: string },
): Promise<Category | null> {
  const existing = await findCategoryById(id);
  if (!existing) return null;
  const update: Partial<CategoryDoc> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.color !== undefined) update.color = patch.color;
  if (Object.keys(update).length > 0) {
    await firestore().collection(COLLECTIONS.categories).doc(id).update(update);
  }
  return findCategoryById(id);
}

export async function deleteCategory(id: string): Promise<boolean> {
  await firestore().collection(COLLECTIONS.categories).doc(id).delete();
  return true;
}
