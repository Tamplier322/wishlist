/// <reference types="vitest/globals" />
import {
  categorySchema,
  itemPatchSchema,
  itemSchema,
  memberRoleSchema,
  refreshTokenSchema,
  registerSchema,
  wishlistPatchSchema,
} from '../validators';

describe('registerSchema', () => {
  it('принимает корректные данные и обрезает пробелы', () => {
    const parsed = registerSchema.parse({
      username: '  wish_user  ',
      email: ' user@example.com ',
      password: 'secret123',
    });

    expect(parsed.username).toBe('wish_user');
    expect(parsed.email).toBe('user@example.com');
  });

  it('запрещает короткое имя и кириллицу', () => {
    expect(
      registerSchema.safeParse({ username: 'ab', email: 'a@b.co', password: 'secret123' }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ username: 'имя', email: 'a@b.co', password: 'secret123' }).success,
    ).toBe(false);
  });

  it('запрещает короткий пароль', () => {
    expect(
      registerSchema.safeParse({ username: 'user', email: 'a@b.co', password: '123' }).success,
    ).toBe(false);
  });

  it('требует буквы и цифры и отсекает частые пароли', () => {
    const base = { username: 'user', email: 'a@b.co' };
    expect(registerSchema.safeParse({ ...base, password: 'abcdefgh' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'password123' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'secret123' }).success).toBe(true);
  });
});

describe('itemSchema', () => {
  it('требует название', () => {
    expect(itemSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('принимает необязательные поля', () => {
    const parsed = itemSchema.parse({
      title: '  Наушники ',
      price: 199.9,
      currency: 'EUR',
      priority: 'high',
      kind: 'tech',
      status: 'wanted',
    });

    expect(parsed.title).toBe('Наушники');
    expect(parsed.price).toBe(199.9);
  });

  it('запрещает отрицательную цену', () => {
    expect(itemSchema.safeParse({ title: 'X', price: -1 }).success).toBe(false);
  });

  it('проверяет схемы ссылок и картинок', () => {
    expect(itemSchema.safeParse({ title: 'X', link: 'https://example.com/p/1' }).success).toBe(
      true,
    );
    expect(itemSchema.safeParse({ title: 'X', link: 'javascript:alert(1)' }).success).toBe(false);
    expect(itemSchema.safeParse({ title: 'X', imageUrl: 'http://example.com/a.png' }).success).toBe(
      false,
    );
    expect(itemSchema.safeParse({ title: 'X', imageUrl: '/uploads/a.png' }).success).toBe(true);
  });

  it('patch-схема допускает частичное обновление', () => {
    expect(itemPatchSchema.safeParse({ status: 'purchased' }).success).toBe(true);
    expect(itemPatchSchema.safeParse({ status: 'unknown' }).success).toBe(false);
  });
});

describe('categorySchema', () => {
  it('требует цвет в формате #RRGGBB', () => {
    expect(categorySchema.safeParse({ name: 'Игры', color: '#a78bfa' }).success).toBe(true);
    expect(categorySchema.safeParse({ name: 'Игры', color: 'red' }).success).toBe(false);
  });
});

describe('wishlistPatchSchema', () => {
  it('принимает режим сюрприза и дедлайн', () => {
    expect(
      wishlistPatchSchema.safeParse({ surpriseMode: true, deadline: '2026-12-31' }).success,
    ).toBe(true);
  });
});

describe('memberRoleSchema', () => {
  it('разрешает только editor и viewer', () => {
    expect(memberRoleSchema.safeParse({ role: 'editor' }).success).toBe(true);
    expect(memberRoleSchema.safeParse({ role: 'owner' }).success).toBe(false);
  });
});

describe('refreshTokenSchema', () => {
  it('требует непустой токен', () => {
    expect(refreshTokenSchema.safeParse({ refreshToken: 'short' }).success).toBe(false);
    expect(refreshTokenSchema.safeParse({ refreshToken: 'a'.repeat(64) }).success).toBe(true);
  });
});
