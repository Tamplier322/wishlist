/// <reference types="vitest/globals" />
import type { Offer } from '../../../types/domain';
import {
  bm25Score,
  buildBm25Context,
  dedupeOffers,
  matchScore,
  normalizeTitle,
  rankOffers,
  totalPriceOf,
} from '../matching';

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'offer-1',
    provider: 'TestStore',
    title: 'Sony WH-1000XM5 headphones',
    price: 300,
    currency: 'USD',
    rating: 4.5,
    ratingSource: 'test',
    extra: null,
    imageUrl: null,
    url: 'https://example.com/p/1',
    ...overrides,
  };
}

describe('normalizeTitle', () => {
  it('приводит регистр, диакритику и лишние пробелы', () => {
    expect(normalizeTitle('  Sony   WH-1000XM5  ')).toBe('sony wh 1000xm5');
    expect(normalizeTitle('Café')).toBe('cafe');
  });

  it('заменяет разделители пробелами', () => {
    expect(normalizeTitle('Sony | WH–1000XM5')).toBe('sony wh 1000xm5');
  });
});

describe('matchScore', () => {
  it('полное совпадение даёт 0', () => {
    expect(matchScore('Sony WH-1000XM5', 'Sony WH-1000XM5')).toBe(0);
  });

  it('далёкое название получает 5', () => {
    expect(matchScore('Чехол для телефона', 'Sony WH-1000XM5')).toBe(5);
  });

  it('пустой запрос — 5', () => {
    expect(matchScore('Sony', '')).toBe(5);
  });
});

describe('BM25', () => {
  it('редкое слово весит больше частого', () => {
    const context = buildBm25Context([
      'Sony WH-1000XM5 headphones',
      'Sony headphones',
      'Generic headphones',
    ]);

    const rare = bm25Score('Sony WH-1000XM5 headphones', ['WH-1000XM5'], context);
    const common = bm25Score('Generic headphones', ['WH-1000XM5'], context);
    expect(rare).toBeGreaterThan(common);
  });

  it('пустой контекст даёт 0', () => {
    expect(bm25Score('anything', ['anything'], buildBm25Context([]))).toBe(0);
  });
});

describe('totalPriceOf', () => {
  it('добавляет доставку и округляет до копеек', () => {
    expect(totalPriceOf(makeOffer({ price: 99.99, shipping: 5.01 }))).toBe(105);
  });

  it('без цены возвращает null', () => {
    expect(totalPriceOf(makeOffer({ price: null }))).toBeNull();
  });
});

describe('rankOffers', () => {
  it('ставит точное совпадение выше похожего и заполняет поля', () => {
    const ranked = rankOffers(
      [
        makeOffer({ id: 'case', title: 'Чехол для наушников', price: 10 }),
        makeOffer({ id: 'target', title: 'Sony WH-1000XM5', price: 300, shipping: 10 }),
      ],
      'Sony WH-1000XM5',
    );

    expect(ranked[0].id).toBe('target');
    expect(ranked[0].exact).toBe(true);
    expect(ranked[0].totalPrice).toBe(310);
    expect(typeof ranked[0].matchScore).toBe('number');
  });
});

describe('dedupeOffers', () => {
  it('оставляет более релевантный дубликат', () => {
    const result = dedupeOffers([
      makeOffer({ id: 'bad', matchScore: 4 }),
      makeOffer({ id: 'good', matchScore: 0 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('good');
  });

  it('не склеивает предложения разных провайдеров', () => {
    const result = dedupeOffers([
      makeOffer({ id: 'a', provider: 'A' }),
      makeOffer({ id: 'b', provider: 'B' }),
    ]);
    expect(result).toHaveLength(2);
  });
});
