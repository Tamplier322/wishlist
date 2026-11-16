import { expect, test, type Page } from '@playwright/test';

const randomSuffix = () => Math.floor(Math.random() * 1_000_000);

async function registerUser(page: Page): Promise<{ username: string; password: string }> {
  const username = `e2e_user_${randomSuffix()}`;
  const password = 'e2e-password-123';

  await page.goto('/register');
  await page.getByLabel(/Имя пользователя|Username/i).fill(username);
  await page.getByLabel(/Email/i).fill(`${username}@test.com`);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /Зарегистрироваться|Sign up/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  return { username, password };
}

test.describe('Landing', () => {
  test('renders hero and navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.feature-card').first()).toBeVisible();
    await expect(page.locator('.footer')).toBeVisible();
  });
});

test.describe('Guest mode', () => {
  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    const password = page.locator('#password');

    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /Показать пароль|Show password/ }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /Скрыть пароль|Hide password/ }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('auth page keeps layout in dark theme', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('wl_theme', 'dark'));
    await page.reload();

    await expect(page.locator('.auth-card')).toBeVisible();

    const layout = await page.evaluate(() => {
      const card = document.querySelector('.auth-card');
      const accent = document.querySelector('.btn-accent');
      const primary = document.querySelector('.btn-primary');
      const styles = (node: Element | null) => (node ? getComputedStyle(node) : null);

      return {
        theme: document.documentElement.dataset.theme,
        cardBg: card ? getComputedStyle(card).backgroundColor : null,
        accentBg: accent ? getComputedStyle(accent).backgroundColor : null,
        primaryColor: primary ? getComputedStyle(primary).color : null,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    expect(layout.theme).toBe('dark');
    expect(layout.cardBg).toBe('rgba(0, 0, 0, 0)');
    expect(layout.overflowX).toBe(false);
  });

  test('guest can add a wish stored in localStorage', async ({ page }) => {
    await page.goto('/guest');
    await expect(page.locator('.success-note')).toBeVisible();

    await page.getByRole('button', { name: /Желание|Wish/i }).first().click();
    await page.getByLabel(/Название|Title/i).fill('E2E тестовое желание');
    await page.getByRole('button', { name: /Сохранить|Save/i }).click();

    await expect(page.locator('.wish-card-title').filter({ hasText: 'E2E тестовое желание' })).toBeVisible();


    await page.reload();
    await expect(page.locator('.wish-card-title').filter({ hasText: 'E2E тестовое желание' })).toBeVisible();
  });
});

test.describe('Auth + wishlist', () => {
  test('register → create list → add wish → offers modal opens', async ({ page }) => {
    const { username } = await registerUser(page);


    await expect(page.locator('.wl-card').first()).toBeVisible();
    await expect(page.locator('.header-user-name')).toHaveText(username);


    await page.getByRole('button', { name: /Новый список|New list/i }).click();
    await page.getByLabel(/Название|Name/i).fill('E2E список');
    await page.getByRole('button', { name: /Создать|Create/i }).click();
    await expect(page.locator('.wl-card-title').filter({ hasText: 'E2E список' })).toBeVisible();


    await page.locator('.wl-card-title').filter({ hasText: 'E2E список' }).click();
    await page.waitForURL('**/wishlist/**');

    await page.getByRole('button', { name: /Желание|Wish/i }).first().click();
    await page.getByLabel(/Название|Title/i).fill('Bluetooth-наушники');
    await page.getByRole('button', { name: /Сохранить|Save/i }).click();

    const card = page.locator('.wish-card').filter({ hasText: 'Bluetooth-наушники' });
    await expect(card).toBeVisible();


    await card.getByRole('button', { name: /Предложения|Offers/i }).click();
    await expect(page.locator('.modal-title')).toBeVisible();
    await expect(page.locator('.offers-links')).toBeVisible({ timeout: 20_000 });
  });

  test('two view modes switch', async ({ page }) => {
    await registerUser(page);
    await page.locator('.wl-card').first().click();
    await page.waitForURL('**/wishlist/**');

    await page.getByRole('tab', { name: /Список|List/i }).click();
    await expect(page.locator('.view-toggle button.active')).toContainText(/Список|List/i);
    await page.getByRole('tab', { name: /Карточки|Cards/i }).click();
    await expect(page.locator('.view-toggle button.active')).toContainText(/Карточки|Cards/i);
  });

  test('login with registered credentials', async ({ page }) => {
    const { username, password } = await registerUser(page);
    await page.getByRole('button', { name: /Выйти|Log out/i }).click();
    await page.waitForURL('http://localhost:5173/');

    await page.goto('/login');
    await page.getByLabel(/Имя пользователя или email|Username or email/i).fill(username);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /Войти|Log in/i }).first().click();

    await page.waitForURL('**/dashboard');
    await expect(page.locator('.header-user-name')).toHaveText(username);
  });

  test('reserve shows who reserved', async ({ page }) => {
    const { username } = await registerUser(page);
    await page.locator('.wl-card').first().click();
    await page.waitForURL('**/wishlist/**');

    await page.getByRole('button', { name: /Желание|Wish/i }).first().click();
    await page.getByLabel(/Название|Title/i).fill('Резерв-тест');
    await page.getByRole('button', { name: /Сохранить|Save/i }).click();

    const card = page.locator('.wish-card').filter({ hasText: 'Резерв-тест' });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Забронировать|Reserve/i }).click();
    await expect(
      card.locator('.badge').filter({ hasText: /Забронировано|Reserved/ }),
    ).toContainText(username);
  });

  test('profile: base currency switch, clickable avatar, avatar upload', async ({ page }) => {
    await registerUser(page);


    const currencySwitch = page.locator('.currency-switch');
    await expect(currencySwitch).toHaveValue('BYN');
    await currencySwitch.selectOption('USD');
    await expect(currencySwitch).toHaveValue('USD');


    await page.locator('a.header-user').click();
    await page.waitForURL('**/profile');
    await expect(page.locator('.profile-name')).toHaveText(/e2e_user_\d+/);


    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.locator('.profile-section input[type=file]').first().setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(page.locator('.avatar-image img').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a.header-user .avatar img')).toBeVisible();
  });
});
