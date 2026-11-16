import type { Offer, WishKind } from '../../../types/domain';
import { fetchJson, formatNumber } from './http';
import type { OfferProvider, OfferQuery } from './types';

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    infoLink?: string;
  };
  saleInfo?: {
    listPrice?: { amount: number; currencyCode: string };
    buyLink?: string;
  };
}


export class GoogleBooksProvider implements OfferProvider {
  readonly name = 'Google Books';
  readonly supportedKinds: readonly WishKind[] = ['book'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`;
    const data = await fetchJson<GoogleBooksResponse>(url);

    return (data.items ?? []).map((item) => {
      const { volumeInfo } = item;
      const authors = volumeInfo.authors?.join(', ');
      const image = volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail ?? null;
      return {
        id: `gbooks-${item.id}`,
        provider: this.name,
        title: authors ? `${volumeInfo.title} · ${authors}` : volumeInfo.title,
        price: item.saleInfo?.listPrice?.amount ?? null,
        currency: item.saleInfo?.listPrice?.currencyCode ?? 'USD',
        rating: volumeInfo.averageRating != null ? volumeInfo.averageRating * 2 : null,
        ratingSource: volumeInfo.averageRating != null ? 'Google Books' : null,
        extra: volumeInfo.ratingsCount ? `${formatNumber(volumeInfo.ratingsCount)} оценок` : null,
        imageUrl: image ? image.replace('http://', 'https://') : null,
        url:
          item.saleInfo?.buyLink ??
          volumeInfo.infoLink ??
          'https://books.google.com/',
      } satisfies Offer;
    });
  }
}
