import type { Offer, WishKind } from '../../../types/domain';
import { fetchJson } from './http';
import type { OfferProvider, OfferQuery } from './types';

interface DummyJsonProduct {
  id: number;
  title: string;
  price: number;
  discountPercentage?: number;
  rating?: number;
  stock?: number;
  brand?: string;
  category?: string;
  thumbnail?: string;
}

interface DummyJsonResponse {
  products?: DummyJsonProduct[];
  total?: number;
}

const productTerms = new Map<number, string[]>();

interface CategoryHint {
  pattern: RegExp;
  slug: string;
  term: string;
}

const CATEGORY_HINTS: readonly CategoryHint[] = [
  { pattern: /headphone|earbud|airpod|headset|наушник|гарнитур/i, slug: 'mobile-accessories', term: 'headphones' },
  { pattern: /laptop|macbook|notebook|ноутбук/i, slug: 'laptops', term: 'laptop' },
  { pattern: /smartphone|iphone|android|телефон|смартфон/i, slug: 'smartphones', term: 'smartphone' },
  { pattern: /tablet|ipad|планшет/i, slug: 'tablets', term: 'tablet' },
  { pattern: /smartwatch|watch|час[ыи]/i, slug: 'mens-watches', term: 'watch' },
  { pattern: /sneaker|shoe|trainer|кроссовк|ботинк|туфл/i, slug: 'mens-shoes', term: 'shoes' },
  { pattern: /backpack|bag|рюкзак|сумк/i, slug: 'womens-bags', term: 'bag' },
  { pattern: /sunglass|очки/i, slug: 'sunglasses', term: 'sunglasses' },
  { pattern: /perfume|fragrance|духи/i, slug: 'fragrances', term: 'perfume' },
  { pattern: /skin.?care|cream|крем|косметик/i, slug: 'skin-care', term: 'skincare' },
  { pattern: /furniture|chair|desk|кресл|стол/i, slug: 'furniture', term: 'furniture' },
  { pattern: /kitchen|посуда|чайник|kettle|кружк|tumbler|cup|mug/i, slug: 'kitchen-accessories', term: 'kitchen' },
];

function findHint(query: string): CategoryHint | null {
  return CATEGORY_HINTS.find((hint) => hint.pattern.test(query)) ?? null;
}

function mapProduct(product: DummyJsonProduct, searchTerms?: string[]): Offer {
  const discount = product.discountPercentage ?? 0;
  const stock = product.stock ?? 0;

  return {
    id: `dummyjson-${product.id}`,
    provider: product.brand ? `DummyJSON · ${product.brand}` : 'DummyJSON Market',
    title: product.title,
    price: product.price > 0 ? product.price : null,
    currency: 'USD',
    rating: product.rating != null ? product.rating * 2 : null,
    ratingSource: product.rating != null ? 'DummyJSON' : null,
    extra:
      discount > 0
        ? `−${Math.round(discount)}%`
        : stock > 0
          ? `${stock} в наличии`
          : product.category ?? null,
    imageUrl: product.thumbnail ?? null,
    url: `https://dummyjson.com/products/${product.id}`,
    searchTerms,
  } satisfies Offer;
}

export class DummyJsonProvider implements OfferProvider {
  readonly name = 'DummyJSON Market';
  readonly supportedKinds: readonly WishKind[] = ['tech', 'other', 'app', 'game', 'book'];

  async findOffers({ query }: OfferQuery): Promise<Offer[]> {
    const url = `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}&limit=10`;
    const data = await fetchJson<DummyJsonResponse>(url);
    const products = [...(data.products ?? [])];

    if (products.length < 4) {
      const hint = findHint(query);
      if (hint) {
        try {
          const category = await fetchJson<DummyJsonResponse>(
            `https://dummyjson.com/products/category/${hint.slug}?limit=8`,
          );
          const terms = [hint.term, ...hint.slug.split('-')];
          for (const product of category.products ?? []) {
            if (products.some((entry) => entry.id === product.id)) continue;
            products.push(product);
            productTerms.set(product.id, terms);
          }
        } catch {
        }
      }
    }

    return products.map((product) => mapProduct(product, productTerms.get(product.id)));
  }
}
