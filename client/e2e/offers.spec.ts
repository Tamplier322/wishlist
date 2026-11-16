import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import type { Offer } from '../../server/src/types/domain';
import type { Priority, WishItem } from '../src/types';

const requireModule = createRequire(import.meta.url);
const { dedupeOffers, matchScore, rankOffers } =
  requireModule('../../server/src/services/offers/matching') as typeof import('../../server/src/services/offers/matching');
const { buildQueryPlan, cleanQuery, translateQuery } =
  requireModule('../../server/src/services/offers/query') as typeof import('../../server/src/services/offers/query');

function makeOffer(input: Partial<Offer> & { id: string; title: string }): Offer {
  return {
    provider: 'Test Market',
    price: null,
    currency: 'USD',
    rating: null,
    ratingSource: null,
    extra: null,
    imageUrl: null,
    url: 'https://example.com',
    ...input,
  };
}

test.describe('offer query planning', () => {
  test('translates Russian product words and adds synonyms', () => {
    const plan = buildQueryPlan('Bluetooth-наушники');

    expect(plan.primary.join(' | ')).toContain('Bluetooth headphones');
    expect(plan.keywords).toContain('headphones');
    expect(plan.keywords).toContain('airpods');
  });

  test('strips generic prefixes and translates phrases', () => {
    expect(cleanQuery('Книга Гарри Поттер')).toBe('Гарри Поттер');
    expect(translateQuery('Настольная игра Catan')).toBe('board game Catan');
    expect(translateQuery('Беспроводные наушники')).toBe('wireless headphones');
  });

  test('keeps the original Russian book title as a primary variant', () => {
    const plan = buildQueryPlan('Книга Гарри Поттер');

    expect(plan.primary).toContain('Гарри Поттер');
    expect(plan.primary.some((value) => value.toLowerCase().includes('book'))).toBe(true);
  });

  test('expands laptop and sneaker queries with brand keywords', () => {
    const laptopKeywords = buildQueryPlan('Ноутбук MacBook Air').keywords.map((value) =>
      value.toLowerCase(),
    );
    expect(laptopKeywords).toContain('macbook');
    expect(buildQueryPlan('Кроссовки Nike').keywords).toContain('shoes');
  });
});

test.describe('offer matching', () => {
  test('matches by word boundaries, not substrings', () => {
    expect(matchScore('Huawei Matebook X Pro', 'book')).toBe(5);
    expect(matchScore('Apple AirPods Max Silver', 'airpods')).toBe(1);
  });

  test('handles Russian phrases and model numbers', () => {
    expect(matchScore('Сборник фанфиков Гарри Поттер', 'Гарри Поттер')).toBe(1);
    expect(matchScore('Apple MacBook Air', 'MacBook Air')).toBe(1);
    expect(matchScore('iPhone 15 Pro Max Case', 'iPhone 15 Pro')).toBe(1);
    expect(matchScore('iPhone 12 Silicone Case', 'iPhone 15 Pro')).toBeGreaterThanOrEqual(3);
  });

  test('ranks exact matches above category hints and drops unrelated items', () => {
    const ranked = rankOffers(
      [
        makeOffer({ id: 'laptop', title: 'Huawei Matebook X Pro', price: 1399.99 }),
        makeOffer({
          id: 'airpods',
          title: 'Apple AirPods Max',
          price: 549.99,
          searchTerms: ['headphones'],
        }),
        makeOffer({ id: 'headphones', title: 'Bluetooth Headphones Pro', price: 99 }),
      ],
      ['Bluetooth headphones'],
      ['headphones'],
    );

    expect(ranked[0].title).toBe('Bluetooth Headphones Pro');
    expect(ranked[0].exact).toBe(true);

    const airpods = ranked.find((offer) => offer.id === 'airpods');
    expect(airpods?.matchScore).toBe(4);
    expect(airpods?.relevanceScore).toBe(4);
    expect(airpods?.exact).toBe(false);

    const laptop = ranked.find((offer) => offer.id === 'laptop');
    expect(laptop?.matchScore).toBe(5);
    expect(laptop?.exact).toBe(false);
  });

  test('dedupes offers keeping the best relevance score', () => {
    const deduped = dedupeOffers([
      makeOffer({ id: '1', title: 'iPhone 15 Pro', provider: 'A', price: 999, matchScore: 5 }),
      makeOffer({ id: '2', title: 'iPhone 15 Pro', provider: 'A', price: 999, matchScore: 1 }),
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].matchScore).toBe(1);
  });
});

function seedItem(title: string, index: number): WishItem {
  const priorities: Priority[] = ['high', 'medium', 'low'];
  const now = '2026-01-01T00:00:00.000Z';

  return {
    id: `seed-${index}`,
    wishlistId: 'guest',
    authorId: 'guest',
    authorName: 'Гость',
    authorColor: '#60a5fa',
    categoryId: null,
    title,
    description: 'Описание тестового желания',
    link: '',
    imageUrl: '',
    price: null,
    currency: 'USD',
    priority: priorities[index % priorities.length],
    kind: 'other',
    status: 'wanted',
    reservedBy: null,
    reservedByName: null,
    reservedByColor: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedGuest(page: Page, titles: string[]): Promise<void> {
  const state = {
    items: titles.map((title, index) => seedItem(title, index)),
    categories: [],
  };
  await page.addInitScript((payload) => {
    localStorage.setItem('wl_guest_wishlist', JSON.stringify(payload));
  }, state);
}

test.describe('expanded wish card and modal positioning', () => {
  test('clicking a card opens the expanded wish card with offers', async ({ page }) => {
    await seedGuest(page, ['Bluetooth-наушники']);
    await page.goto('/guest');

    const card = page.locator('.wish-card').filter({ hasText: 'Bluetooth-наушники' });
    await expect(card).toBeVisible();
    await card.locator('.wish-card-title').click();

    const details = page.getByTestId('wish-details');
    await expect(details).toBeVisible();
    await expect(details.locator('.wish-details-title')).toHaveText('Bluetooth-наушники');
    await expect(details.getByTestId('offers-panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(details).toBeHidden();
  });

  test('offers modal stays inside the viewport after scrolling the list', async ({ page }) => {
    await seedGuest(
      page,
      Array.from({ length: 14 }, (_, index) => `Желание ${index + 1}`),
    );
    await page.goto('/guest');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(200);

    await page
      .locator('.wish-card')
      .last()
      .getByRole('button', { name: /Предложения|Offers/i })
      .click();

    const modal = page.getByTestId('modal');
    await expect(modal).toBeVisible();

    const box = await modal.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(viewport!.height);

    const overlayTop = await page
      .getByTestId('modal-overlay')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.abs(overlayTop)).toBeLessThan(1);

    const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(bodyOverflow).toBe('hidden');
  });
});
