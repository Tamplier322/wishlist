import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestore, COLLECTIONS } from '../../config/firebase';
import type { PublicUser } from '../../types/domain';

export function toData<T>(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentData): T {
  const raw = 'data' in snapshot && typeof snapshot.data === 'function' ? snapshot.data() : snapshot;
  return raw as T;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function getUsersByIds(ids: readonly string[]): Promise<Map<string, PublicUser>> {
  const unique = [...new Set(ids)].filter((id) => id !== '');
  const map = new Map<string, PublicUser>();
  if (unique.length === 0) return map;

  const db = firestore();
  for (const group of chunk(unique, 300)) {
    const refs = group.map((id) => db.collection(COLLECTIONS.users).doc(id));
    const snapshots = await db.getAll(...refs);
    snapshots.forEach((snapshot) => {
      if (!snapshot.exists) return;
      const data = snapshot.data() ?? {};
      map.set(snapshot.id, {
        id: snapshot.id,
        username: String(data.username ?? ''),
        avatarColor: String(data.avatarColor ?? '#c9762e'),
      });
    });
  }
  return map;
}

export function sortBy<T>(items: T[], selector: (item: T) => string, direction: 'asc' | 'desc' = 'asc'): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => selector(left).localeCompare(selector(right)) * factor);
}
