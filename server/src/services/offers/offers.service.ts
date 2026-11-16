import type { BestPrice, Offer, OffersResult, WishKind } from '../../types/domain';
import { buildSearchLinks } from './providers/search-links';
import { CheapSharkProvider } from './providers/cheapshark.provider';
import { GoogleBooksProvider } from './providers/google-books.provider';
import { ITunesProvider } from './providers/itunes.provider';
import { SteamMarketProvider } from './providers/steam-market.provider';
import type { OfferProvider } from './providers/types';
import { matchedWordsCount, matchScore, rankOffers } from './matching';


const steam = new SteamMarketProvider();
const cheapShark = new CheapSharkProvider();
const googleBooks = new GoogleBooksProvider();
const iTunes = new ITunesProvider();

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_OFFERS = 24;

interface CacheEntry {
  result: OffersResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();


function selectProviders(kind: WishKind): readonly OfferProvider[] {
  switch (kind) {
    case 'skin':
      return [steam];
    case 'game':
      return [cheapShark];
    case 'book':
      return [googleBooks];
    case 'app':
      return [iTunes];
    default:

      return [];
  }
}


function relevantOffers(offers: Offer[], query: string): Offer[] {
  return offers.filter((offer) => matchScore(offer.title, query) <= 2);
}

function pickBestImage(offers: Offer[], query: string): string | null {
  const candidates = relevantOffers(offers, query).filter(
    (offer) => offer.imageUrl !== null && offer.imageUrl !== '',
  );
  const best = candidates.find(
    (offer) =>
      matchScore(offer.title, query) <= 1 || matchedWordsCount(offer.title, query) >= 2,
  );
  return best?.imageUrl ?? null;
}


function findBestPrice(offers: Offer[], query: string): BestPrice | null {
  const best = offers.find(
    (offer): offer is Offer & { price: number } => offer.price !== null && offer.price > 0,
  );
  if (!best) return null;

  return {
    price: best.price,
    currency: best.currency,
    provider: best.provider,
    exact: best.exact === true,
  };
}

export async function findOffers(query: string, kind: WishKind): Promise<OffersResult> {
  const trimmed = query.trim();
  const cacheKey = `${kind}:${trimmed.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const selected = selectProviders(kind);
  const settled = await Promise.allSettled(selected.map((provider) => provider.findOffers({ query: trimmed, kind })));

  const collected: Offer[] = [];
  const providersUsed: string[] = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      collected.push(...result.value);
      providersUsed.push(selected[index].name);
    }
  });

  const offers = rankOffers(collected, trimmed).slice(0, MAX_OFFERS);

  const output: OffersResult = {
    query: trimmed,
    kind,
    offers,
    searchLinks: buildSearchLinks(trimmed, kind),
    providersUsed,
    bestPrice: findBestPrice(offers, trimmed),
  };

  cache.set(cacheKey, { result: output, expiresAt: Date.now() + CACHE_TTL_MS });
  return output;
}


export async function findRelevantOfferImage(
  offers: Offer[],
  query: string,
): Promise<string | null> {
  return pickBestImage(offers, query);
}


export async function findBestImage(query: string, kind: WishKind): Promise<string | null> {
  const result = await findOffers(query, kind);
  return pickBestImage(result.offers, query);
}
