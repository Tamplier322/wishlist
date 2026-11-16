import { useMemo } from 'react';
import { useAppSelector } from '../../app/hooks';
import { convertAmount, type Rates } from '../../utils/currency';
import type { BestPrice } from '../../types';


export function useMarketPrices(): Map<string, BestPrice> {
  const queries = useAppSelector((state) => state.api.queries);

  return useMemo(() => {
    const map = new Map<string, BestPrice>();
    Object.values(queries).forEach((entry) => {
      const record = entry as
        | {
            endpointName?: string;
            data?: unknown;
            originalArgs?: { query?: string; kind?: string };
          }
        | undefined;
      if (record?.endpointName !== 'getBestPrice') return;
      const best = record.data as BestPrice | null | undefined;
      if (!best) return;
      const { query, kind } = record.originalArgs ?? {};
      if (!query || !kind) return;
      map.set(`${query}|${kind}`, best);
    });
    return map;
  }, [queries]);
}

export interface CurrencyTotal {
  currency: string;
  sum: number;
}


export function computeCategoryTotals(
  items: readonly { categoryId: string | null; title: string; kind: string; price: number | null; currency: string }[],
  market: Map<string, BestPrice>,
  base: string,
  rates: Rates | null,
): Map<string, CurrencyTotal[]> {
  const buckets = new Map<string, Map<string, number>>();

  items.forEach((item) => {
    if (!item.categoryId) return;
    const price = item.price ?? market.get(`${item.title}|${item.kind}`)?.price;
    if (price === undefined || price === null) return;

    const converted = convertAmount(price, item.currency, base, rates);
    let currency: string;
    let value: number;
    if (converted !== null) {
      currency = base;
      value = converted;
    } else {
      currency = item.currency;
      value = price;
    }

    const currencyBucket = buckets.get(item.categoryId) ?? new Map<string, number>();
    currencyBucket.set(currency, (currencyBucket.get(currency) ?? 0) + value);
    buckets.set(item.categoryId, currencyBucket);
  });

  const result = new Map<string, CurrencyTotal[]>();
  buckets.forEach((currencyBucket, categoryId) => {
    const totals = [...currencyBucket.entries()]
      .map(([currency, sum]) => ({ currency, sum }))
      .sort((a, b) => b.sum - a.sum);
    result.set(categoryId, totals);
  });
  return result;
}
