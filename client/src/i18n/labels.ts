import type { ItemStatus, Priority, WishKind } from '../types';
import type { TranslationKey } from './index';

export const PRIORITY_KEYS: Record<Priority, TranslationKey> = {
  low: 'wishlist.priorityLow',
  medium: 'wishlist.priorityMedium',
  high: 'wishlist.priorityHigh',
};

export const KIND_KEYS: Record<WishKind, TranslationKey> = {
  game: 'kinds.game',
  skin: 'kinds.skin',
  book: 'kinds.book',
  app: 'kinds.app',
  tech: 'kinds.tech',
  other: 'kinds.other',
};

export const KIND_SHORT_KEYS: Record<WishKind, TranslationKey> = {
  game: 'kinds.gameShort',
  skin: 'kinds.skinShort',
  book: 'kinds.bookShort',
  app: 'kinds.appShort',
  tech: 'kinds.techShort',
  other: 'kinds.otherShort',
};

export const STATUS_KEYS: Record<ItemStatus, TranslationKey> = {
  wanted: 'statuses.wanted',
  reserved: 'statuses.reserved',
  purchased: 'statuses.purchased',
};

export const DAY_FORM_KEYS: Record<Intl.LDMLPluralRule, TranslationKey> = {
  zero: 'filters.dayMany',
  one: 'filters.dayOne',
  two: 'filters.dayFew',
  few: 'filters.dayFew',
  many: 'filters.dayMany',
  other: 'filters.dayMany',
};
