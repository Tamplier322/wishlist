import { register } from './auth.service';
import { addItem } from './item.service';
import { createWishlistForUser } from './wishlist.service';

export interface SeedResult {
  username: string;
  password: string;
  wishlistId: string;
  itemCount: number;
}

const SEED_ITEMS: ReadonlyArray<{ title: string; priority: 'low' | 'medium' | 'high' }> = [
  { title: 'Наушники Sony WH-1000XM5', priority: 'high' },
  { title: 'Книга «Чистый код»', priority: 'medium' },
  { title: 'Игра The Legend of Zelda', priority: 'low' },
];

export async function seedTestData(): Promise<SeedResult> {
  const suffix = Date.now().toString(36);
  const username = `e2e_${suffix}`;
  const password = 'e2e-password';
  const auth = await register({
    username,
    email: `${username}@example.com`,
    password,
  });

  const wishlist = await createWishlistForUser(auth.user.id, {
    name: `E2E список ${suffix}`,
    description: 'Данные, созданные seed-эндпоинтом',
  });

  for (const item of SEED_ITEMS) {
    await addItem(wishlist.id, auth.user.id, item);
  }

  return {
    username,
    password,
    wishlistId: wishlist.id,
    itemCount: SEED_ITEMS.length,
  };
}
