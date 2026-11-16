import { firestore, COLLECTIONS } from '../../config/firebase';
import { createId } from '../../utils/ids';
import type { Workspace } from '../../types/domain';

interface WorkspaceDoc {
  ownerId: string;
  name: string;
  color: string;
  createdAt: string;
}

function toWorkspace(id: string, data: WorkspaceDoc): Workspace {
  return {
    id,
    ownerId: data.ownerId,
    name: data.name,
    color: data.color,
    createdAt: data.createdAt,
  };
}

export async function createWorkspace(input: {
  ownerId: string;
  name: string;
  color: string;
}): Promise<Workspace> {
  const id = createId();
  const doc: WorkspaceDoc = {
    ownerId: input.ownerId,
    name: input.name,
    color: input.color,
    createdAt: new Date().toISOString(),
  };
  await firestore().collection(COLLECTIONS.workspaces).doc(id).set(doc);
  return toWorkspace(id, doc);
}

export async function findWorkspacesByOwner(ownerId: string): Promise<Workspace[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.workspaces)
    .where('ownerId', '==', ownerId)
    .get();
  return snapshot.docs
    .map((doc) => toWorkspace(doc.id, doc.data() as WorkspaceDoc))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function findWorkspaceById(id: string): Promise<Workspace | null> {
  const snapshot = await firestore().collection(COLLECTIONS.workspaces).doc(id).get();
  if (!snapshot.exists) return null;
  return toWorkspace(id, snapshot.data() as WorkspaceDoc);
}

export async function updateWorkspace(
  id: string,
  patch: { name?: string; color?: string },
): Promise<Workspace | null> {
  const existing = await findWorkspaceById(id);
  if (!existing) return null;
  const update: Partial<WorkspaceDoc> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.color !== undefined) update.color = patch.color;
  if (Object.keys(update).length > 0) {
    await firestore().collection(COLLECTIONS.workspaces).doc(id).update(update);
  }
  return findWorkspaceById(id);
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = firestore();
  const lists = await db.collection(COLLECTIONS.wishlists).where('workspaceId', '==', id).get();
  const batch = db.batch();
  lists.docs.forEach((doc) => batch.update(doc.ref, { workspaceId: null }));
  batch.delete(db.collection(COLLECTIONS.workspaces).doc(id));
  await batch.commit();
}

export async function assignListToWorkspace(
  wishlistId: string,
  workspaceId: string | null,
): Promise<void> {
  await firestore().collection(COLLECTIONS.wishlists).doc(wishlistId).update({ workspaceId });
}
