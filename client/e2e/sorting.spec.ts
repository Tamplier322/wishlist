import { expect, test } from '@playwright/test';
import { groupAndSortByPriority } from '../src/utils/priority';
import type { Priority, WishItem } from '../src/types';

function makeItem(input: {
  id: string;
  title: string;
  priority: Priority;
  price?: number | null;
  createdAt?: string;
}): WishItem {
  return {
    id: input.id,
    wishlistId: 'wishlist',
    authorId: 'user',
    authorName: 'User',
    authorColor: '#000000',
    categoryId: null,
    title: input.title,
    description: '',
    link: '',
    imageUrl: '',
    price: input.price ?? null,
    currency: 'USD',
    priority: input.priority,
    kind: 'other',
    status: 'wanted',
    reservedBy: null,
    reservedByName: null,
    reservedByColor: null,
    createdAt: input.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: input.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
}

test.describe('priority grouping and sorting', () => {
  test('groups always go high → medium → low', () => {
    const groups = groupAndSortByPriority([
      makeItem({ id: '1', title: 'Low', priority: 'low' }),
      makeItem({ id: '2', title: 'High', priority: 'high' }),
      makeItem({ id: '3', title: 'Medium', priority: 'medium' }),
    ]);

    expect(groups.map((group) => group.priority)).toEqual(['high', 'medium', 'low']);
  });

  test('default mode preserves the incoming order inside each group', () => {
    const groups = groupAndSortByPriority([
      makeItem({ id: 'h1', title: 'High first', priority: 'high' }),
      makeItem({ id: 'm1', title: 'Medium', priority: 'medium' }),
      makeItem({ id: 'h2', title: 'High second', priority: 'high' }),
    ]);

    expect(groups[0].items.map((item) => item.id)).toEqual(['h1', 'h2']);
    expect(groups[1].items.map((item) => item.id)).toEqual(['m1']);
  });

  test('price ascending sorts inside groups and keeps unpriced items last', () => {
    const groups = groupAndSortByPriority(
      [
        makeItem({ id: 'h1', title: 'Expensive', priority: 'high', price: 100 }),
        makeItem({ id: 'h2', title: 'No price', priority: 'high', price: null }),
        makeItem({ id: 'h3', title: 'Cheap', priority: 'high', price: 10 }),
        makeItem({ id: 'm1', title: 'Medium', priority: 'medium', price: 50 }),
      ],
      'price-asc',
    );

    expect(groups[0].items.map((item) => item.id)).toEqual(['h3', 'h1', 'h2']);
    expect(groups[1].items.map((item) => item.id)).toEqual(['m1']);
  });

  test('price descending sorts inside groups and keeps unpriced items last', () => {
    const groups = groupAndSortByPriority(
      [
        makeItem({ id: 'h1', title: 'Cheap', priority: 'high', price: 10 }),
        makeItem({ id: 'h2', title: 'No price', priority: 'high', price: null }),
        makeItem({ id: 'h3', title: 'Expensive', priority: 'high', price: 100 }),
      ],
      'price-desc',
    );

    expect(groups[0].items.map((item) => item.id)).toEqual(['h3', 'h1', 'h2']);
  });

  test('title sorting is case-insensitive and stays inside groups', () => {
    const groups = groupAndSortByPriority(
      [
        makeItem({ id: 'h1', title: 'banana', priority: 'high' }),
        makeItem({ id: 'h2', title: 'Apple', priority: 'high' }),
        makeItem({ id: 'm1', title: 'Cherry', priority: 'medium' }),
      ],
      'title-asc',
    );

    expect(groups[0].items.map((item) => item.title)).toEqual(['Apple', 'banana']);
    expect(groups[1].items.map((item) => item.title)).toEqual(['Cherry']);
  });
});
