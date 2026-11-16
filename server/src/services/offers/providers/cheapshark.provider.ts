import type { Offer, WishKind } from '../../../types/domain';
import { fetchJson, formatNumber } from './http';
import type { OfferProvider, OfferQuery } from './types';

interface CheapSharkDeal {
  dealID: string;
  title: string;
  salePrice: string;
  steamAppID: string | null;
  metacriticScore: string;
  steamRatingPercent: string;
  steamRatingCount: string;
  thumb: string;
  storeID: string;
}

interface CheapSharkStore {
  storeID: string;
  storeName: string;
}

let storesCache: Map<string, string> | null = null;

async function getStoreNames(): Promise<Map<string, string>> {
  if (!storesCache) {
    try {
      const stores = await fetchJson<CheapSharkStore[]>('https://www.cheapshark.com/api/1.0/stores');
      storesCache = new Map(stores.map((store) => [store.storeID, store.storeName]));
    } catch {
      storesCache = new Map();
    }
  }
  return storesCache;
}

function parseRating(deal: CheapSharkDeal): { rating: number | null; source: string | null } {
  const steamPercent = Number(deal.steamRatingPercent);
  if (deal.steamRatingPercent && !Number.isNaN(steamPercent) && steamPercent > 0) {
    return { rating: steamPercent / 10, source: 'Steam' };
  }
  const metacritic = Number(deal.metacriticScore);
  if (deal.metacriticScore && !Number.isNaN(metacritic) && metacritic > 0) {
    return { rating: metacritic / 10, source: 'Metacritic' };
  }
  return { rating: null, source: null };
}


export class CheapSharkProvider implements OfferProvider {
  readonly name = 'CheapShark';
  readonly supportedKinds: readonly WishKind[] = ['game'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const url = `https://www.cheapshark.com/api/1.0/deals?title=${encodeURIComponent(query)}&pageSize=8&sortBy=Deal%20Rating`;
    const deals = await fetchJson<CheapSharkDeal[]>(url);
    const storeNames = await getStoreNames();

    return deals.map((deal) => {
      const { rating, source } = parseRating(deal);
      const ratingCount = Number(deal.steamRatingCount);
      return {
        id: `cheapshark-${deal.dealID}`,
        provider: storeNames.get(deal.storeID) ?? this.name,
        title: deal.title,
        price: Number(deal.salePrice) || null,
        currency: 'USD',
        rating,
        ratingSource: source,
        extra: ratingCount > 0 ? `${formatNumber(ratingCount)} оценок Steam` : null,
        imageUrl: deal.thumb || null,
        url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
      } satisfies Offer;
    });
  }
}
