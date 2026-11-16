import type { Priority, WishItem } from '../types';


export const PRIORITY_ORDER: readonly Priority[] = ['high', 'medium', 'low'];

export type SortMode = 'default' | 'price-asc' | 'price-desc' | 'title-asc';

export interface PriorityGroup {
  priority: Priority;
  items: WishItem[];
}


export function priorityRank(priority: Priority): number {
  return PRIORITY_ORDER.indexOf(priority);
}

function comparePrice(a: WishItem, b: WishItem, direction: 'asc' | 'desc'): number {
  if (a.price === null && b.price === null) return 0;
  if (a.price === null) return 1;
  if (b.price === null) return -1;
  return direction === 'asc' ? a.price - b.price : b.price - a.price;
}

export function compareItems(a: WishItem, b: WishItem, mode: SortMode): number {
  switch (mode) {
    case 'price-asc':
      return comparePrice(a, b, 'asc');
    case 'price-desc':
      return comparePrice(a, b, 'desc');
    case 'title-asc':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
    default:
      return 0;
  }
}

export function groupAndSortByPriority(
  items: WishItem[],
  mode: SortMode = 'default',
): PriorityGroup[] {
  return PRIORITY_ORDER.map((priority) => {
    const groupItems = items.filter((item) => item.priority === priority);
    if (mode !== 'default') {
      groupItems.sort((a, b) => compareItems(a, b, mode));
    }
    return { priority, items: groupItems };
  }).filter((group) => group.items.length > 0);
}

export function groupByPriority(items: WishItem[]): PriorityGroup[] {
  return groupAndSortByPriority(items, 'default');
}
