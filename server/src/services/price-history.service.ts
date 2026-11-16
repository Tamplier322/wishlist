import type { BestPrice, WishKind } from '../types/domain';
import { createPricePoint, listPricePoints } from '../repositories/price-history.repository';

export interface PricePoint {
  t: string;
  price: number;
  currency: string;
  provider: string;
}

const WRITE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const HISTORY_DAYS = 90;
const MAX_POINTS = 120;

const lastWrites = new Map<string, { at: number; price: number }>();

export function priceHistoryKey(query: string): string {
  return query.trim().toLowerCase();
}

export function recordBestPrice(query: string, kind: WishKind, best: BestPrice | null): void {
  if (!best) return;

  const key = `${kind}:${priceHistoryKey(query)}`;
  const now = Date.now();
  const last = lastWrites.get(key);
  const changedEnough =
    !last || Math.abs(last.price - best.price) / Math.max(1, last.price) >= 0.02;
  if (last && now - last.at < WRITE_INTERVAL_MS && !changedEnough) return;

  lastWrites.set(key, { at: now, price: best.price });
  void createPricePoint({
    queryKey: priceHistoryKey(query),
    kind,
    price: best.price,
    currency: best.currency,
    provider: best.provider,
    recordedAt: new Date(now).toISOString(),
  }).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[price-history] не удалось записать точку:', error);
    }
  });
}

export async function getPriceHistory(query: string, kind: WishKind): Promise<PricePoint[]> {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const records = await listPricePoints(priceHistoryKey(query), kind, since, MAX_POINTS);

  return records
    .slice()
    .reverse()
    .map((record) => ({
      t: record.recordedAt,
      price: record.price,
      currency: record.currency,
      provider: record.provider,
    }));
}
