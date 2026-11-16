import type { Offer, WishKind } from '../../../types/domain';
import { fetchJson, formatNumber } from './http';
import type { OfferProvider, OfferQuery } from './types';

interface ITunesResponse {
  results?: ITunesResult[];
}

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName?: string;
  price?: number;
  currency?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  trackViewUrl?: string;
  artworkUrl100?: string;
  kind?: string;
}


export class ITunesProvider implements OfferProvider {
  readonly name = 'App Store / iTunes';
  readonly supportedKinds: readonly WishKind[] = ['app'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=8`;
    const data = await fetchJson<ITunesResponse>(url);

    return (data.results ?? []).map((result) => ({
      id: `itunes-${result.trackId}`,
      provider: this.name,
      title: result.artistName ? `${result.trackName} · ${result.artistName}` : result.trackName,
      price: result.price ?? null,
      currency: result.currency ?? 'USD',
      rating: result.averageUserRating != null ? result.averageUserRating * 2 : null,
      ratingSource: result.averageUserRating != null ? 'App Store' : null,
      extra: result.userRatingCount ? `${formatNumber(result.userRatingCount)} оценок` : null,
      imageUrl: result.artworkUrl100 ?? null,
      url: result.trackViewUrl ?? `https://apps.apple.com/`,
    }));
  }
}
