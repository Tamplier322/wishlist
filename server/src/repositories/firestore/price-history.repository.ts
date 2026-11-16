import { firestore, COLLECTIONS } from '../../config/firebase';

export interface PricePointRecord {
  id: string;
  queryKey: string;
  kind: string;
  price: number;
  currency: string;
  provider: string;
  recordedAt: string;
}

interface PricePointDoc {
  queryKey: string;
  kind: string;
  price: number;
  currency: string;
  provider: string;
  recordedAt: string;
}

function collection() {
  return firestore().collection(COLLECTIONS.priceHistory);
}

export async function createPricePoint(input: {
  queryKey: string;
  kind: string;
  price: number;
  currency: string;
  provider: string;
  recordedAt: string;
}): Promise<void> {
  const doc: PricePointDoc = { ...input };
  await collection().add(doc);
}

export async function findLatestPricePoint(
  queryKey: string,
  kind: string,
): Promise<PricePointRecord | null> {
  const snapshot = await collection()
    .where('queryKey', '==', queryKey)
    .where('kind', '==', kind)
    .orderBy('recordedAt', 'desc')
    .limit(1)
    .get();
  const doc = snapshot.docs[0];
  if (!doc) return null;
  return { id: doc.id, ...(doc.data() as PricePointDoc) };
}

export async function listPricePoints(
  queryKey: string,
  kind: string,
  sinceIso: string,
  limit: number,
): Promise<PricePointRecord[]> {
  const snapshot = await collection()
    .where('queryKey', '==', queryKey)
    .where('kind', '==', kind)
    .where('recordedAt', '>=', sinceIso)
    .orderBy('recordedAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as PricePointDoc) }));
}
