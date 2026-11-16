import type { Offer, WishKind } from '../../../types/domain';
import { fetchJson, formatNumber } from './http';
import type { OfferProvider, OfferQuery } from './types';

const STEAM_IMAGE_BASE = 'https://community.akamai.steamstatic.com/economy/image/';
const MARKET_SEARCH_URL = 'https://steamcommunity.com/market/search/render/';

const APP_NAMES: Record<number, string> = {
  570: 'Dota 2',
  730: 'CS2',
  252490: 'Rust',
  440: 'Team Fortress 2',
};


function resolveAppIds(query: string): number[] {
  const q = query.toLowerCase();
  if (/дот|dota/.test(q)) return [570];
  if (/контр|counter|csgo|cs2|\bcs\b/.test(q)) return [730];
  if (/rust/.test(q)) return [252490];
  if (/tf2|team fortress/.test(q)) return [440];
  return [730, 570];
}

interface SteamSearchResponse {
  success?: boolean;
  total_count?: number;
  results?: SteamSearchResult[];
}

interface SteamSearchResult {
  name: string;
  hash_name: string;
  sell_listings: number;
  sell_price: number;
  asset_description?: { icon_url?: string };
}


export class SteamMarketProvider implements OfferProvider {
  readonly name = 'Steam Community Market';
  readonly supportedKinds: readonly WishKind[] = ['skin'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const offers: Offer[] = [];

    for (const appid of resolveAppIds(query)) {
      let results: SteamSearchResult[] = [];
      try {

        const json = await fetchJson<SteamSearchResponse | null>(
          `${MARKET_SEARCH_URL}?appid=${appid}&norender=1&count=8&query=${encodeURIComponent(query)}`,
        );
        results = json?.results ?? [];
      } catch {
        results = [];
      }

      if (results.length > 0) {
        offers.push(...results.map((item, index) => this.toOffer(item, index, appid)));
        break;
      }
    }

    return offers;
  }

  private toOffer(item: SteamSearchResult, index: number, appid: number): Offer {
    const gameLabel = APP_NAMES[appid] ?? String(appid);
    return {
      id: `steam-${appid}-${index}`,
      provider: `${this.name} · ${gameLabel}`,
      title: item.name,
      price: item.sell_price > 0 ? item.sell_price / 100 : null,
      currency: 'USD',
      rating: null,
      ratingSource: null,
      extra: item.sell_listings ? `${formatNumber(item.sell_listings)} предложений на рынке` : null,
      imageUrl: item.asset_description?.icon_url
        ? STEAM_IMAGE_BASE + item.asset_description.icon_url
        : null,
      url: `https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(item.hash_name)}`,
    };
  }
}
