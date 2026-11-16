/// <reference types="vitest/globals" />
import {
  authResultContract,
  eventContract,
  oauthAccountsContract,
  offersResultContract,
  trashItemContract,
  wishItemContract,
  wishlistContentContract,
  wishlistContract,
} from '../contracts';

const item = {
  id: 'i1',
  wishlistId: 'w1',
  authorId: 'u1',
  authorName: 'Тест',
  authorColor: '#60a5fa',
  categoryId: null,
  title: 'Наушники',
  description: '',
  link: '',
  imageUrl: '',
  price: 199.9,
  currency: 'USD',
  priority: 'high',
  kind: 'tech',
  status: 'reserved',
  reservedBy: 'u2',
  reservedByName: 'Друг',
  reservedByColor: '#f87171',
  reservedUntil: '2026-12-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('wishItemContract', () => {
  it('принимает ответ репозитория', () => {
    expect(wishItemContract.safeParse(item).success).toBe(true);
  });

  it('ловит отсутствие обязательного поля', () => {
    const { title: _title, ...broken } = item;
    expect(wishItemContract.safeParse(broken).success).toBe(false);
  });

  it('ловит неизвестный статус', () => {
    expect(wishItemContract.safeParse({ ...item, status: 'lost' }).success).toBe(false);
  });
});

describe('trashItemContract', () => {
  it('требует дату мягкого удаления', () => {
    expect(
      trashItemContract.safeParse({ ...item, deletedAt: '2026-02-01T00:00:00.000Z' }).success,
    ).toBe(true);
    expect(trashItemContract.safeParse(item).success).toBe(false);
  });
});

describe('eventContract', () => {
  it('принимает запись журнала и ловит неизвестное действие', () => {
    const event = {
      id: 'e1',
      wishlistId: 'w1',
      actorId: 'u1',
      actorName: 'Тест',
      action: 'item-added',
      targetId: 'i1',
      title: 'Наушники',
      detail: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(eventContract.safeParse(event).success).toBe(true);
    expect(eventContract.safeParse({ ...event, action: 'item-teleported' }).success).toBe(false);
  });
});

describe('oauthAccountsContract', () => {
  it('принимает список способов входа и доступность провайдеров', () => {
    const payload = {
      accounts: [
        {
          provider: 'google',
          displayName: 'Иван',
          avatarUrl: 'https://example.com/a.png',
          email: 'ivan@example.com',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      hasPassword: false,
      available: {
        google: true,
        telegram: { enabled: true, botUsername: 'wishlist_bot', botId: '123456789' },
      },
    };

    expect(oauthAccountsContract.safeParse(payload).success).toBe(true);
    expect(
      oauthAccountsContract.safeParse({ ...payload, accounts: [{ provider: 'myspace' }] }).success,
    ).toBe(false);
  });
});

describe('wishlistContract', () => {
  it('принимает список с режимом сюрприза', () => {
    const wishlist = {
      id: 'w1',
      ownerId: 'u1',
      name: 'Список',
      description: '',
      isShared: true,
      shareSlug: 'abc',
      inviteCode: null,
      deadline: null,
      surpriseMode: true,
      workspaceId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    expect(wishlistContract.safeParse(wishlist).success).toBe(true);
    expect(wishlistContract.safeParse({ ...wishlist, surpriseMode: 'yes' }).success).toBe(false);
  });
});

describe('wishlistContentContract', () => {
  it('принимает полный ответ /wishlists/:id/content', () => {
    const content = {
      wishlist: {
        id: 'w1',
        ownerId: 'u1',
        name: 'Список',
        description: '',
        isShared: false,
        shareSlug: null,
        inviteCode: 'invite-code',
        deadline: '2026-12-31',
        surpriseMode: false,
        workspaceId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      members: [
        {
          id: 'm1',
          wishlistId: 'w1',
          userId: 'u1',
          role: 'owner',
          color: '#dd7a3d',
          joinedAt: '2026-01-01T00:00:00.000Z',
          user: { id: 'u1', username: 'Тест', avatarColor: '#dd7a3d' },
        },
      ],
      categories: [{ id: 'c1', ownerId: 'u1', name: 'Техника', color: '#38bdf8', position: 0 }],
      items: [item],
      inviteCode: 'invite-code',
    };

    expect(wishlistContentContract.safeParse(content).success).toBe(true);
  });
});

describe('offersResultContract', () => {
  it('принимает ответ поиска предложений', () => {
    const result = {
      query: 'наушники',
      kind: 'tech',
      offers: [
        {
          id: 'o1',
          provider: 'TestStore',
          title: 'Sony WH-1000XM5',
          price: 300,
          currency: 'USD',
          shipping: 10,
          totalPrice: 310,
          rating: 4.7,
          ratingSource: 'store',
          extra: null,
          imageUrl: null,
          url: 'https://example.com/p/1',
          exact: true,
          matchScore: 0,
          relevanceScore: 0,
        },
      ],
      searchLinks: [{ name: 'Google', url: 'https://google.com/search?q=test' }],
      providersUsed: ['TestStore'],
      bestPrice: {
        price: 300,
        currency: 'USD',
        provider: 'TestStore',
        exact: true,
        shipping: 10,
        totalPrice: 310,
      },
    };

    expect(offersResultContract.safeParse(result).success).toBe(true);
  });

  it('требует массив предложений', () => {
    expect(
      offersResultContract.safeParse({
        query: 'x',
        kind: 'tech',
        offers: null,
        searchLinks: [],
        providersUsed: [],
        bestPrice: null,
      }).success,
    ).toBe(false);
  });
});

describe('authResultContract', () => {
  it('принимает пару токенов и пользователя', () => {
    expect(
      authResultContract.safeParse({
        token: 'access-token-value',
        refreshToken: 'refresh-token-value',
        user: { id: 'u1', username: 'Тест', avatarColor: '#60a5fa' },
      }).success,
    ).toBe(true);
  });
});
