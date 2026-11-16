import type { IconName } from '../components/Icon';
import type { Priority, WishItem } from '../types';

export const KIND_ICONS: Record<WishItem['kind'], IconName> = {
  game: 'gamepad',
  skin: 'tag',
  book: 'book',
  app: 'phone',
  tech: 'laptop',
  other: 'gift',
};

export const PRIORITY_ICONS: Record<Priority, IconName> = {
  high: 'flame',
  medium: 'star',
  low: 'leaf',
};
