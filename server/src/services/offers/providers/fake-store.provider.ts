import type { Offer, WishKind } from '../../../types/domain';
import { normalizeTitle } from '../matching';
import { fetchJson, formatNumber } from './http';
import type { OfferProvider, OfferQuery } from './types';

interface FakeStoreProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: { rate: number; count: number };
}

let productsCache: FakeStoreProduct[] | null = null;

async function loadProducts(): Promise<FakeStoreProduct[]> {
  if (!productsCache) {
    productsCache = await fetchJson<FakeStoreProduct[]>('https://fakestoreapi.com/products', 10_000);
  }
  return productsCache;
}

export class FakeStoreProvider implements OfferProvider {
  readonly name = 'Fake Store';
  readonly supportedKinds: readonly WishKind[] = ['tech', 'other', 'app', 'game', 'book'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const words = normalizeTitle(query)
      .split(' ')
      .filter((word) => word.length >= 3);

    if (words.length === 0) return [];

    const products = await loadProducts();
    const matched = products
      .filter((product) => {
        const haystack = normalizeTitle(`${product.title} ${product.category} ${product.description}`);
        return words.some((word) => haystack.includes(word));
      })
      .slice(0, 8);

    return matched.map((product) => ({
      id: `fakestore-${product.id}`,
      provider: this.name,
      title: product.title,
      price: product.price > 0 ? product.price : null,
      currency: 'USD',
      rating: product.rating ? product.rating.rate * 2 : null,
      ratingSource: product.rating ? 'Fake Store' : null,
      extra: product.rating?.count
        ? `${formatNumber(product.rating.count)} оценок`
        : product.category,
      imageUrl: product.image,
      url: `https://fakestoreapi.com/products/${product.id}`,
    } satisfies Offer));
  }
}
