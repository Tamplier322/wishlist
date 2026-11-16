import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';

export interface PricePointRecord {
  id: string;
  queryKey: string;
  kind: string;
  price: number;
  currency: string;
  provider: string;
  recordedAt: string;
}

interface PricePointRow {
  id: string;
  query_key: string;
  kind: string;
  price: number;
  currency: string;
  provider: string;
  recorded_at: string;
}

function toRecord(row: PricePointRow): PricePointRecord {
  return {
    id: row.id,
    queryKey: row.query_key,
    kind: row.kind,
    price: row.price,
    currency: row.currency,
    provider: row.provider,
    recordedAt: row.recorded_at,
  };
}

export async function createPricePoint(input: {
  queryKey: string;
  kind: string;
  price: number;
  currency: string;
  provider: string;
  recordedAt: string;
}): Promise<void> {
  await execRun(
    `INSERT INTO price_history (id, query_key, kind, price, currency, provider, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      createId(),
      input.queryKey,
      input.kind,
      input.price,
      input.currency,
      input.provider,
      input.recordedAt,
    ],
  );
}

export async function findLatestPricePoint(
  queryKey: string,
  kind: string,
): Promise<PricePointRecord | null> {
  const row = await getRow<PricePointRow>(
    `SELECT id, query_key, kind, price, currency, provider, recorded_at
     FROM price_history
     WHERE query_key = ? AND kind = ?
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [queryKey, kind],
  );
  return row ? toRecord(row) : null;
}

export async function listPricePoints(
  queryKey: string,
  kind: string,
  sinceIso: string,
  limit: number,
): Promise<PricePointRecord[]> {
  const rows = await getRows<PricePointRow>(
    `SELECT id, query_key, kind, price, currency, provider, recorded_at
     FROM price_history
     WHERE query_key = ? AND kind = ? AND recorded_at >= ?
     ORDER BY recorded_at DESC
     LIMIT ?`,
    [queryKey, kind, sinceIso, limit],
  );
  return rows.map(toRecord);
}
