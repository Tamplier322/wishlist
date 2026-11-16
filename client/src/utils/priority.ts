import type { Priority, WishItem } from '../types';


export const PRIORITY_ORDER: readonly Priority[] = ['high', 'medium', 'low'];

export interface PriorityGroup {
  priority: Priority;
  items: WishItem[];
}


export function groupByPriority(items: WishItem[]): PriorityGroup[] {
  return PRIORITY_ORDER.map((priority) => ({
    priority,
    items: items.filter((item) => item.priority === priority),
  })).filter((group) => group.items.length > 0);
}


export function priorityRank(priority: Priority): number {
  return PRIORITY_ORDER.indexOf(priority);
}
