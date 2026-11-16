import { expect, test, type Page } from '@playwright/test';
import type { WishItem } from '../src/types';

test.skip(process.env.CI === 'true', 'Скриншот-эталоны платформозависимы');

function seedItem(title: string, index: number): WishItem {
  const now = '2026-01-01T00:00:00.000Z';

  return {
    id: `visual-seed-${index}`,
    wishlistId: 'guest',
    authorId: 'guest',
    authorName: 'Гость',
    authorColor: '#60a5fa',
    categoryId: null,
    title,
    description: 'Описание тестового желания',
    link: '',
    imageUrl: '',
    price: index === 0 ? 24990 : null,
    currency: 'RUB',
    priority: index === 0 ? 'high' : 'medium',
    kind: index === 2 ? 'game' : 'other',
    status: 'wanted',
    reservedBy: null,
    reservedByName: null,
    reservedByColor: null,
    reservedUntil: null,
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

const TITLES = ['Наушники Sony WH-1000XM5', 'Книга «Чистый код»', 'The Legend of Zelda'];

test.describe('visual snapshots', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('guest list on desktop', async ({ page }) => {
    await seedGuest(page, TITLES);
    await page.goto('/guest');
    await expect(page.locator('.wish-card').first()).toBeVisible();

    await expect(page).toHaveScreenshot('guest-desktop.png', { fullPage: true });
  });
});

test.describe('visual snapshots (mobile)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  test('guest list on phone', async ({ page }) => {
    await seedGuest(page, TITLES);
    await page.goto('/guest');
    await expect(page.locator('.wish-card').first()).toBeVisible();

    await expect(page).toHaveScreenshot('guest-mobile.png', { fullPage: true });
  });
});
