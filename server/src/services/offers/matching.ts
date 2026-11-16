import type { Offer } from '../../types/domain';

const WEAR_SUFFIX = /\s*\([^)]*\)\s*$/;
const FANCY_PREFIX = /^(stattrak|souvenir|star)\s*/;

const NOISE_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'for',
  'with',
  'edition',
  'version',
  'new',
  'original',
  'genuine',
  'official',
  'купить',
  'товар',
  'новый',
  'новая',
  'новое',
  'оригинал',
  'оригинальный',
]);

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[|•·–—_]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalizeTitle(value)
    .split(' ')
    .filter((word) => word.length > 1 && !NOISE_WORDS.has(word));
}

function baseName(value: string): string {
  const noWear = normalizeTitle(value).replace(WEAR_SUFFIX, '');
  return noWear.replace(FANCY_PREFIX, '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(needle)}(\\s|$)`, 'u');
  return pattern.test(haystack);
}

export function matchScore(title: string, query: string): number {
  const fullTitle = normalizeTitle(title);
  const fullQuery = normalizeTitle(query);
  if (!fullQuery || !fullTitle) return 5;

  if (fullTitle === fullQuery) return 0;
  if (containsPhrase(fullTitle, fullQuery)) return 1;
  if (containsPhrase(fullQuery, fullTitle) && fullTitle.length >= 3) return 2;

  if (baseName(title) === baseName(query)) return 2;

  const titleWords = tokens(title);
  const queryWords = tokens(query);
  if (queryWords.length === 0 || titleWords.length === 0) return 5;

  const titleSet = new Set(titleWords);
  const matched = queryWords.filter((word) => titleSet.has(word)).length;
  const ratio = matched / queryWords.length;

  if (ratio >= 0.75) return 2;
  if (ratio >= 0.5) return 3;
  if (ratio > 0) return 4;
  return 5;
}

export function matchScoreAny(title: string, queries: readonly string[]): number {
  if (queries.length === 0) return 5;
  return Math.min(...queries.map((query) => matchScore(title, query)));
}

export function matchedWordsCount(title: string, query: string): number {
  const titleWords = new Set(tokens(title));
  return tokens(query).filter((word) => titleWords.has(word)).length;
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export interface Bm25Context {
  documentFrequency: Map<string, number>;
  averageLength: number;
  documents: number;
}

export function buildBm25Context(titles: readonly string[]): Bm25Context {
  const documentFrequency = new Map<string, number>();
  let totalLength = 0;

  for (const title of titles) {
    const words = tokens(title);
    totalLength += words.length;
    for (const word of new Set(words)) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
    }
  }

  return {
    documentFrequency,
    averageLength: titles.length > 0 ? totalLength / titles.length : 0,
    documents: titles.length,
  };
}

export function bm25Score(
  title: string,
  queries: readonly string[],
  context: Bm25Context,
): number {
  if (context.documents === 0) return 0;

  const words = tokens(title);
  if (words.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (const word of words) {
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  const averageLength = context.averageLength || 1;
  let best = 0;

  for (const query of queries) {
    const queryWords = tokens(query);
    if (queryWords.length === 0) continue;

    let score = 0;
    for (const term of queryWords) {
      const frequency = frequencies.get(term) ?? 0;
      if (frequency === 0) continue;

      const documentFrequency = context.documentFrequency.get(term) ?? 0;
      const idf = Math.log(
        1 + (context.documents - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      const denominator =
        frequency + BM25_K1 * (1 - BM25_B + BM25_B * (words.length / averageLength));
      score += idf * ((frequency * (BM25_K1 + 1)) / denominator);
    }

    if (score > best) best = score;
  }

  return best;
}

function hintScore(offer: Offer, queries: readonly string[]): number {
  const terms = offer.searchTerms ?? [];
  if (terms.length === 0) return 5;

  const normalizedQueries = queries.map(normalizeTitle).filter(Boolean);
  if (normalizedQueries.length === 0) return 5;

  const queryWords = new Set(normalizedQueries.flatMap((value) => value.split(' ')));

  const matched = terms.some((term) => {
    const normalized = normalizeTitle(term);
    if (!normalized) return false;
    if (normalizedQueries.some((query) => containsPhrase(query, normalized))) return true;
    return normalized.split(' ').some((word) => word.length > 1 && queryWords.has(word));
  });

  return matched ? 4 : 5;
}

export function rankOffers(
  offers: Offer[],
  primaryQueries: string | readonly string[],
  fallbackQueries: readonly string[] = [],
): Offer[] {
  const primary = typeof primaryQueries === 'string' ? [primaryQueries] : primaryQueries;
  const allQueries = [...primary, ...fallbackQueries];
  const bm25Context = buildBm25Context(offers.map((offer) => offer.title));

  return offers
    .map((offer) => {
      const primaryScore = matchScoreAny(offer.title, primary);
      const baseScore =
        primaryScore === 5 && fallbackQueries.length > 0
          ? matchScoreAny(offer.title, fallbackQueries)
          : primaryScore;
      const hint = hintScore(offer, allQueries);
      const score = Math.min(baseScore, hint);
      const relevanceScore = Math.min(primaryScore, hint);
      const bm25 = bm25Score(offer.title, allQueries, bm25Context);
      return { offer, score, relevanceScore, exact: primaryScore <= 1, bm25 };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.bm25 !== b.bm25) return b.bm25 - a.bm25;
      const totalA = totalPriceOf(a.offer) ?? Number.MAX_SAFE_INTEGER;
      const totalB = totalPriceOf(b.offer) ?? Number.MAX_SAFE_INTEGER;
      if (totalA !== totalB) return totalA - totalB;
      return (b.offer.rating ?? -1) - (a.offer.rating ?? -1);
    })
    .map(({ offer, score, relevanceScore, exact }) => ({
      ...offer,
      matchScore: score,
      relevanceScore,
      exact,
      totalPrice: totalPriceOf(offer),
    }));
}

export function totalPriceOf(offer: Offer): number | null {
  if (offer.price === null) return null;
  return Math.round((offer.price + (offer.shipping ?? 0)) * 100) / 100;
}

export function dedupeOffers(offers: Offer[]): Offer[] {
  const seen = new Map<string, Offer>();

  for (const offer of offers) {
    const key = [
      normalizeTitle(offer.title),
      offer.provider.toLowerCase(),
      offer.price ?? '',
      offer.currency,
    ].join('|');

    const existing = seen.get(key);
    if (!existing || (offer.matchScore ?? 99) < (existing.matchScore ?? 99)) {
      seen.set(key, offer);
    }
  }

  return Array.from(seen.values());
}
