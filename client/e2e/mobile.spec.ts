import { expect, test, type Page } from '@playwright/test';
import type { WishItem } from '../src/types';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

function seedItem(title: string, index: number): WishItem {
  const now = '2026-01-01T00:00:00.000Z';

  return {
    id: `mobile-seed-${index}`,
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
    priority: index % 2 === 0 ? 'high' : 'medium',
    kind: 'other',
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

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
}

test.describe('mobile layout', () => {
  test('header is compact and the page has no horizontal overflow', async ({ page }) => {
    await page.goto('/guest');

    await expect(page.locator('.burger-btn')).toBeVisible();
    await expect(page.locator('.header-actions .lang-switch')).toBeHidden();
    await expect(page.locator('.header-actions .currency-switch')).toBeHidden();
    await expect(page.locator('.header-actions .theme-toggle')).toBeHidden();

    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test('guest adds a wish via floating button and opens full-screen details', async ({ page }) => {
    await page.goto('/guest');

    const fab = page.locator('.mobile-fab');
    await expect(fab).toBeVisible();
    await fab.click();

    await page.getByLabel(/Название|Title/i).fill('Bluetooth-наушники');
    await page.getByRole('button', { name: /Сохранить|Save/i }).click();

    const card = page.locator('.wish-card').filter({ hasText: 'Bluetooth-наушники' });
    await expect(card).toBeVisible();
    await card.locator('.wish-card-title').click();

    const details = page.getByTestId('wish-details');
    await expect(details).toBeVisible();

    const box = await page.getByTestId('modal').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(380);
    expect(box!.height).toBeGreaterThan(760);

    await page.keyboard.press('Escape');
    await expect(details).toBeHidden();
  });

  test('offers modal opens as a bottom sheet', async ({ page }) => {
    await seedGuest(page, ['Minecraft']);
    await page.goto('/guest');

    await page
      .locator('.wish-card')
      .getByRole('button', { name: /Предложения|Offers/i })
      .click();

    const modal = page.getByTestId('modal');
    await expect(modal).toBeVisible();

    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(380);
    expect(box!.y).toBeGreaterThan(40);
    expect(box!.y + box!.height).toBeGreaterThan(820);
  });

  test('landing and auth screens fit the phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero h1')).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

    await page.goto('/login');
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.locator('.auth-side')).toBeHidden();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
