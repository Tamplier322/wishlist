import { env } from '../../config/env';
import { offersProviderErrors } from '../../config/metrics';
import { sharedCache } from '../cache';
import type { BestPrice, Offer, OffersResult, WishKind } from '../../types/domain';
import { buildSearchLinks } from './providers/search-links';
import { CheapSharkProvider } from './providers/cheapshark.provider';
import { DummyJsonProvider } from './providers/dummyjson.provider';
import { FakeStoreProvider } from './providers/fake-store.provider';
import { GoogleBooksProvider } from './providers/google-books.provider';
import { ITunesProvider } from './providers/itunes.provider';
import { OpenLibraryProvider } from './providers/open-library.provider';
import { SteamMarketProvider } from './providers/steam-market.provider';
import type { OfferProvider } from './providers/types';
import { canRequest, recordFailure, recordSuccess } from './circuit-breaker';
import { dedupeOffers, matchScoreAny, rankOffers, totalPriceOf } from './matching';
import { buildQueryPlan } from './query';
import { translateToEnglish } from './translation';
import { recordBestPrice } from '../price-history.service';

const steam = new SteamMarketProvider();
const cheapShark = new CheapSharkProvider();
const googleBooks = new GoogleBooksProvider();
const openLibrary = new OpenLibraryProvider();
const iTunes = new ITunesProvider();
const dummyJson = new DummyJsonProvider();
const fakeStore = new FakeStoreProvider();

const MAX_OFFERS = 24;

const PROVIDER_QUALITY: Record<string, number> = {
  Steam: 10,
  CheapShark: 9,
  'Google Books': 9,
  'Open Library': 8,
  iTunes: 8,
  DummyJSON: 6,
  FakeStore: 5,
};

function byQuality(providers: readonly OfferProvider[]): OfferProvider[] {
  return [...providers].sort(
    (left, right) => (PROVIDER_QUALITY[right.name] ?? 0) - (PROVIDER_QUALITY[left.name] ?? 0),
  );
}

function selectProviders(kind: WishKind): readonly OfferProvider[] {
  switch (kind) {
    case 'skin':
      return byQuality([steam, dummyJson, fakeStore]);
    case 'game':
      return byQuality([cheapShark, iTunes, dummyJson, fakeStore]);
    case 'book':
      return byQuality([googleBooks, openLibrary, iTunes, dummyJson]);
    case 'app':
      return byQuality([iTunes, googleBooks, dummyJson, fakeStore]);
    case 'tech':
      return byQuality([dummyJson, fakeStore, iTunes]);
    default:
      return byQuality([dummyJson, fakeStore, googleBooks, iTunes]);
  }
}

async function searchProvider(
  provider: OfferProvider,
  variants: readonly string[],
  kind: WishKind,
): Promise<Offer[]> {
  if (!canRequest(provider.name)) return [];

  const collected: Offer[] = [];
  const seen = new Set<string>();
  let lastError: unknown = null;

  for (const query of variants.slice(0, 3)) {
    try {
      const offers = await provider.findOffers({ query, kind });
      for (const offer of offers) {
        const key = `${offer.provider}|${offer.title}|${offer.price ?? ''}|${offer.currency}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(offer);
      }
      if (collected.length >= 6) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (collected.length > 0) {
    recordSuccess(provider.name);
    return collected;
  }
  if (lastError) {
    recordFailure(provider.name);
    offersProviderErrors.inc({ provider: provider.name });
    throw lastError;
  }
  recordSuccess(provider.name);
  return [];
}

function relevanceOf(offer: Offer): number {
  return offer.relevanceScore ?? offer.matchScore ?? 99;
}

function pickBestImage(offers: Offer[]): string | null {
  const withImage = offers.filter((offer) => offer.imageUrl !== null && offer.imageUrl !== '');
  const best = withImage.find((offer) => relevanceOf(offer) <= 3);
  return best?.imageUrl ?? null;
}

function findBestPrice(offers: Offer[]): BestPrice | null {
  const priced = offers.filter(
    (offer): offer is Offer & { price: number } => offer.price !== null && offer.price > 0,
  );
  const relevant = priced.filter((offer) => relevanceOf(offer) <= 3);
  if (relevant.length === 0) return null;

  const best = relevant.reduce((current, offer) => {
    const currentTotal = totalPriceOf(current) ?? Number.MAX_SAFE_INTEGER;
    const offerTotal = totalPriceOf(offer) ?? Number.MAX_SAFE_INTEGER;
    return offerTotal < currentTotal ? offer : current;
  });

  return {
    price: best.price,
    currency: best.currency,
    provider: best.provider,
    exact: best.exact === true,
    shipping: best.shipping ?? null,
    totalPrice: totalPriceOf(best),
  };
}

export async function findOffers(query: string, kind: WishKind): Promise<OffersResult> {
  const trimmed = query.trim();
  const cacheKey = `offers:${kind}:${trimmed.toLowerCase()}`;
  const cached = await sharedCache.get<OffersResult>(cacheKey);
  if (cached) return cached;

  const plan = buildQueryPlan(trimmed);
  const primaryVariants = [...plan.primary];
  const keywordVariants = [...plan.keywords];
  const selected = selectProviders(kind);
  const collected: Offer[] = [];
  const providersUsed = new Set<string>();

  function addVariants(primary: readonly string[], keywords: readonly string[]): string[] {
    const added: string[] = [];
    for (const value of [...primary, ...keywords]) {
      const key = value.toLowerCase();
      if (primaryVariants.some((entry) => entry.toLowerCase() === key)) continue;
      if (keywordVariants.some((entry) => entry.toLowerCase() === key)) continue;
      if (primary.includes(value)) primaryVariants.push(value);
      else keywordVariants.push(value);
      added.push(value);
    }
    return added;
  }

  async function collectFrom(variantList: readonly string[]): Promise<void> {
    const settled = await Promise.allSettled(
      selected.map((provider) => searchProvider(provider, variantList, kind)),
    );

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.length > 0) {
          collected.push(...result.value);
          providersUsed.add(selected[index].name);
        }
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[offers] ${selected[index].name} failed:`, result.reason);
      }
    });
  }

  await collectFrom([...primaryVariants, ...keywordVariants]);

  const hasLatinOnly = primaryVariants.some(
    (value) => /[a-z]/i.test(value) && !/[а-яё]/i.test(value),
  );
  const relevantCount = collected.filter(
    (offer) => matchScoreAny(offer.title, primaryVariants) <= 3,
  ).length;

  if (!hasLatinOnly && relevantCount < 3) {
    const translated = await translateToEnglish(trimmed);
    if (translated) {
      const translatedPlan = buildQueryPlan(translated);
      const extra = addVariants(translatedPlan.primary, translatedPlan.keywords);
      if (extra.length > 0) await collectFrom(extra);
    }
  }

  const ranked = dedupeOffers(rankOffers(collected, primaryVariants, keywordVariants));
  const offers = ranked
    .filter((offer) => (offer.matchScore ?? 5) <= 4)
    .slice(0, MAX_OFFERS);

  const output: OffersResult = {
    query: trimmed,
    kind,
    offers,
    searchLinks: buildSearchLinks(trimmed, kind),
    providersUsed: Array.from(providersUsed),
    bestPrice: findBestPrice(offers),
  };

  await sharedCache.set(cacheKey, output, env.offersCacheTtlMs);
  recordBestPrice(trimmed, kind, output.bestPrice);
  return output;
}

export async function findRelevantOfferImage(
  offers: Offer[],
  _query: string,
): Promise<string | null> {
  return pickBestImage(offers);
}

export async function findBestImage(query: string, kind: WishKind): Promise<string | null> {
  const result = await findOffers(query, kind);
  return pickBestImage(result.offers);
}
