import type { Offer } from '../../types/domain';




const WEAR_SUFFIX = /\s*\([^)]*\)\s*$/;
const FANCY_PREFIX = /^(stattrak|souvenir|star)\s*/;

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[|•·–—_]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function baseName(value: string): string {
  const noWear = normalizeTitle(value).replace(WEAR_SUFFIX, '');
  return noWear.replace(FANCY_PREFIX, '').trim();
}


export function matchScore(title: string, query: string): number {
  const fullTitle = normalizeTitle(title);
  const fullQuery = normalizeTitle(query);
  if (!fullQuery) return 4;

  if (fullTitle === fullQuery) return 0;
  if (fullTitle.includes(fullQuery)) return 1;

  if (baseName(title) === baseName(query)) return 2;

  if (fullTitle.includes(fullQuery)) return 3;

  const words = fullQuery.split(' ');
  return words.every((word) => fullTitle.includes(word)) ? 3 : 4;
}


export function matchedWordsCount(title: string, query: string): number {
  const normalizedTitle = normalizeTitle(title);
  return normalizeTitle(query)
    .split(' ')
    .filter((word) => word.length > 0 && normalizedTitle.includes(word)).length;
}


export function rankOffers(offers: Offer[], query: string): Offer[] {
  return offers
    .map((offer) => ({ offer, score: matchScore(offer.title, query) }))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      const priceA = a.offer.price ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.offer.price ?? Number.MAX_SAFE_INTEGER;
      if (priceA !== priceB) return priceA - priceB;
      return (b.offer.rating ?? -1) - (a.offer.rating ?? -1);
    })
    .map(({ offer, score }) => ({ ...offer, exact: score === 0 }));
}
