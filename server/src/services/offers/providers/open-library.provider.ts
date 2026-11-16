import type { Offer, WishKind } from '../../../types/domain';
import { fetchJson, formatNumber } from './http';
import type { OfferProvider, OfferQuery } from './types';

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  ratings_average?: number;
  ratings_count?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

export class OpenLibraryProvider implements OfferProvider {
  readonly name = 'Open Library';
  readonly supportedKinds: readonly WishKind[] = ['book', 'other'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const url =
      'https://openlibrary.org/search.json' +
      `?q=${encodeURIComponent(query)}` +
      '&limit=8' +
      '&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count';

    const data = await fetchJson<OpenLibraryResponse>(url);

    return (data.docs ?? []).map((doc) => {
      const authors = doc.author_name?.slice(0, 2).join(', ');
      const year = doc.first_publish_year;
      return {
        id: `openlibrary-${doc.key}`,
        provider: this.name,
        title: authors ? `${doc.title} · ${authors}` : doc.title,
        price: null,
        currency: 'USD',
        rating: doc.ratings_average != null ? doc.ratings_average * 2 : null,
        ratingSource: doc.ratings_average != null ? 'Open Library' : null,
        extra:
          year != null
            ? `${year}`
            : doc.ratings_count
              ? `${formatNumber(doc.ratings_count)} оценок`
              : null,
        imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        url: `https://openlibrary.org${doc.key}`,
      } satisfies Offer;
    });
  }
}
