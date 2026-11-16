
const GENERIC_PREFIX =
  /^(книга|книгу|книги|игра|игру|игры|фильм|приложение|скин|товар|подарок|купить)\s+/iu;

const PHRASES: ReadonlyArray<[RegExp, string]> = [
  [/настольн[\p{L}]*\s+игр[\p{L}]*/giu, 'board game'],
  [/беспроводн[\p{L}]*\s+наушник[\p{L}]*/giu, 'wireless headphones'],
  [/кофемашин[\p{L}]*/giu, 'coffee machine'],
  [/термокружк[\p{L}]*/giu, 'tumbler'],
  [/фотоаппарат[\p{L}]*/giu, 'camera'],
  [/пылесос[\p{L}]*/giu, 'vacuum cleaner'],
  [/плейстейшн[\p{L}]*/giu, 'playstation'],
];

const TRANSLATIONS: Record<string, string> = {
  наушники: 'headphones',
  наушник: 'headphones',
  гарнитура: 'headset',
  ноутбук: 'laptop',
  ноутбуки: 'laptops',
  телефон: 'smartphone',
  телефоны: 'smartphones',
  смартфон: 'smartphone',
  смартфоны: 'smartphones',
  планшет: 'tablet',
  планшеты: 'tablets',
  клавиатура: 'keyboard',
  клавиатуры: 'keyboards',
  мышь: 'mouse',
  мышки: 'mouse',
  монитор: 'monitor',
  мониторы: 'monitors',
  колонка: 'speaker',
  колонки: 'speakers',
  телевизор: 'tv',
  телевизоры: 'tv',
  пылесос: 'vacuum cleaner',
  часы: 'watch',
  смартчасы: 'smartwatch',
  книга: 'book',
  книги: 'books',
  книгу: 'book',
  игра: 'game',
  игры: 'games',
  игру: 'game',
  консоль: 'console',
  приставка: 'console',
  кроссовки: 'sneakers',
  кроссовок: 'sneakers',
  ботинки: 'boots',
  туфли: 'shoes',
  куртка: 'jacket',
  куртку: 'jacket',
  футболка: 't-shirt',
  футболку: 't-shirt',
  джинсы: 'jeans',
  свитер: 'sweater',
  шапка: 'hat',
  шарф: 'scarf',
  перчатки: 'gloves',
  рюкзак: 'backpack',
  сумка: 'bag',
  кошелек: 'wallet',
  очки: 'glasses',
  зонт: 'umbrella',
  бутылка: 'bottle',
  термокружка: 'tumbler',
  кофе: 'coffee',
  кофемашина: 'coffee machine',
  чайник: 'kettle',
  духи: 'perfume',
  крем: 'cream',
  шампунь: 'shampoo',
  косметика: 'cosmetics',
  подарок: 'gift',
  сертификат: 'gift card',
  велосипед: 'bicycle',
  самокат: 'scooter',
  скейтборд: 'skateboard',
  гитара: 'guitar',
  микрофон: 'microphone',
  камера: 'camera',
  фотоаппарат: 'camera',
  принтер: 'printer',
  роутер: 'router',
  флешка: 'flash drive',
  жесткий: 'hard',
  диск: 'drive',
  кресло: 'chair',
  стол: 'desk',
  лампа: 'lamp',
  коврик: 'mat',
  плед: 'blanket',
  подушка: 'pillow',
  посуда: 'dishes',
  набор: 'set',
  инструмент: 'tool',
  инструменты: 'tools',
};

const SYNONYMS: Record<string, string[]> = {
  headphones: ['airpods', 'earbuds'],
  headset: ['headphones'],
  laptop: ['macbook', 'notebook'],
  smartphone: ['iphone', 'android'],
  tablet: ['ipad'],
  monitor: ['display'],
  speaker: ['speakers', 'soundbar'],
  tv: ['television'],
  watch: ['smartwatch'],
  sneakers: ['shoes', 'trainers'],
  boots: ['shoes'],
  shoes: ['sneakers'],
  jacket: ['coat'],
  backpack: ['bag'],
  bag: ['backpack'],
  camera: ['dslr'],
  console: ['playstation', 'xbox'],
  book: ['books', 'novel'],
  cleaner: ['vacuum'],
  tumbler: ['cup', 'mug'],
  gift: ['present'],
  bicycle: ['bike'],
};

function uniqueQueries(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function cleanQuery(query: string): string {
  let value = query.replace(/[|•·–—_]+/g, ' ').replace(/\s+/g, ' ').trim();
  value = value.replace(GENERIC_PREFIX, '').trim();
  return value;
}

function translateWord(word: string): string {
  const key = word
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/^-+|-+$/g, '');

  return TRANSLATIONS[key] ?? word;
}

export function translateQuery(query: string): string {
  let value = query;

  for (const [pattern, replacement] of PHRASES) {
    value = value.replace(pattern, replacement);
  }

  value = value.replace(/[-–—/]+/g, ' ');

  return value
    .split(/\s+/)
    .map(translateWord)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface QueryPlan {
  primary: string[];
  keywords: string[];
}

export function buildQueryPlan(query: string): QueryPlan {
  const original = query.replace(/\s+/g, ' ').trim();
  const cleaned = cleanQuery(original);
  const translated = translateQuery(original);
  const translatedCleaned = translateQuery(cleaned);

  const primary = uniqueQueries([original, cleaned, translated, translatedCleaned]).slice(0, 4);

  const baseWords = translated
    .split(' ')
    .filter((word) => /^[a-z0-9-]+$/i.test(word) && word.length >= 4)
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);

  const keywords = uniqueQueries(
    baseWords.flatMap((word) => [word, ...(SYNONYMS[word.toLowerCase()] ?? [])]),
  )
    .filter((word) => !primary.some((value) => value.toLowerCase() === word.toLowerCase()))
    .slice(0, 5);

  return { primary, keywords };
}

export function buildQueryVariants(query: string): string[] {
  const { primary, keywords } = buildQueryPlan(query);
  return [...primary, ...keywords].slice(0, 6);
}
