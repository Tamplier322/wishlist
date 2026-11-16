import type { Category, WishKind } from '../types';

const CATEGORY_RULES: ReadonlyArray<{ pattern: RegExp; kind: WishKind }> = [
  { pattern: /книг|book/, kind: 'book' },
  { pattern: /игр|game|консол/, kind: 'game' },
  { pattern: /прилож|app|медиа|музык|фильм/, kind: 'app' },
  {
    pattern: /техн|электрон|смартф|ноутб|компью|наушн|телев|быт|фото|видео|аудио/,
    kind: 'tech',
  },
];

const TITLE_RULES: ReadonlyArray<{ pattern: RegExp; kind: WishKind }> = [
  { pattern: /скин|steam|dota|cs2|csgo|статтрак|statrak/, kind: 'skin' },
  { pattern: /книг|book|роман|повесть/, kind: 'book' },
  { pattern: /консол|playstation|xbox|nintendo/, kind: 'game' },
  { pattern: /подписк|прилож|apple music|spotify/, kind: 'app' },
  { pattern: /телефон|ноутб|наушн|телев|пылесос|планшет|колонк|смартф|фотоаппарат/, kind: 'tech' },
];


export function detectKind(
  title: string,
  categoryId: string | null,
  categories: readonly Category[],
): WishKind {
  const categoryName = (categories.find((category) => category.id === categoryId)?.name ?? '').toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(categoryName)) return rule.kind;
  }

  const lowerTitle = title.toLowerCase();
  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(lowerTitle)) return rule.kind;
  }

  return 'other';
}
