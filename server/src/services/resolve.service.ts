import { findWishlistByInviteCode } from '../repositories/wishlist.repository';
import { fetchJson } from './offers/providers/http';

export interface ResolvedLink {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'ru,en;q=0.9',
};

function decode(value: string): string {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

function meta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return null;
}


function slugTitle(url: string): string {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(slug).replace(/[-_+]+/g, ' ').replace(/\.\w{2,5}$/, '').trim();
  } catch {
    return '';
  }
}

function parseAmount(value: string | null): number | null {
  if (value === null) return null;

  const normalized = value.replace(/\u00a0|\u202f|\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

interface PriceResult {
  price: number | null;
  currency: string | null;
}


function currencyFromSymbol(symbol: string, url: string): string | null {
  const s = symbol.toLowerCase();
  if (s === '₽' || s === 'rub' || s === 'руб') return 'RUB';
  if (s === '$' || s === 'usd') return 'USD';
  if (s === '€' || s === 'eur') return 'EUR';
  if (s === 'br' || s === 'byn') return 'BYN';
  if (s === 'р') return url.toLowerCase().includes('.by') ? 'BYN' : 'RUB';
  return null;
}


function visiblePriceInText(text: string, url: string): PriceResult | null {
  const match = text.match(
    /(\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(руб|₽|byn|br|usd|\$|€|р)(?![a-zA-Zа-яА-ЯёЁ])/i,
  );
  if (!match) return null;
  const price = parseAmount(match[1]);
  if (price === null) return null;
  return { price, currency: currencyFromSymbol(match[2], url) };
}


function fixCentsPrice(html: string, url: string, found: PriceResult): PriceResult {
  const rawPrice = found.price;
  if (
    rawPrice === null ||
    !Number.isInteger(rawPrice) ||
    rawPrice < 10000 ||
    rawPrice % 100 !== 0
  ) {
    return found;
  }

  const gtmPrice = parseAmount(html.match(/['"]price['"]\s*:\s*['"](\d+(?:[.,]\d+)?)['"]/i)?.[1] ?? null);
  const visible = visiblePriceInText(
    meta(html, 'og:title') ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '',
    url,
  );

  const confirmed =
    gtmPrice !== null && Math.abs(gtmPrice * 100 - rawPrice) < 0.01
      ? gtmPrice
      : visible !== null && visible.price !== null && Math.abs(visible.price * 100 - rawPrice) < 0.01
        ? visible.price
        : null;

  if (confirmed === null) return found;

  const currency = visible?.currency ?? found.currency ?? (url.toLowerCase().includes('.by') ? 'BYN' : null);
  return { price: confirmed, currency };
}


function collectLdPrice(node: unknown, into: PriceResult): void {
  if (into.price !== null && into.currency !== null) return;
  if (Array.isArray(node)) {
    for (const child of node) collectLdPrice(child, into);
    return;
  }
  if (typeof node !== 'object' || node === null) return;

  const obj = node as Record<string, unknown>;
  if (into.price === null) {
    const raw = obj.price ?? obj.lowPrice ?? obj.highPrice;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) into.price = raw;
    if (typeof raw === 'string') into.price = parseAmount(raw);
  }
  if (into.currency === null && typeof obj.priceCurrency === 'string' && obj.priceCurrency) {
    into.currency = obj.priceCurrency.toUpperCase();
  }
  for (const child of Object.values(obj)) collectLdPrice(child, into);
}


function jsonLdBlocks(html: string): unknown[] {
  const results: unknown[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1].trim().replace(/[\n\t\r]/g, ' ');
    try {
      results.push(JSON.parse(raw));
    } catch {
      void 0;
    }
  }
  return results;
}


function isProductLikeType(type: string): boolean {
  return /product|offer|book|movie|tvseries|videogame|game|vehicle|model|software|music/i.test(type);
}


function findLdProductName(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findLdProductName(child);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object' || node === null) return null;

  const obj = node as Record<string, unknown>;
  if (typeof obj.name === 'string' && obj.name.trim()) {
    const type = obj['@type'];
    const typeList = Array.isArray(type) ? type.map(String).join(',') : typeof type === 'string' ? type : '';
    if (isProductLikeType(typeList)) return obj.name.trim();
  }
  for (const child of Object.values(obj)) {
    const found = findLdProductName(child);
    if (found) return found;
  }
  return null;
}


function cleanSeoTitle(raw: string): string {

  const first = raw.split(/\s*[|•·]\s*|\s+[—–]\s+/)[0].trim();

  const withoutBuy = first.replace(/^(?:купить|цена(?:\s+на)?|buy)\s+/i, '').trim();
  return withoutBuy.length > 3 ? withoutBuy : raw.trim();
}


function itemprop(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+itemprop=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${name}["']`, 'i'),
    new RegExp(`<[^>]+itemprop=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return null;
}


function findPrice(html: string, url: string): PriceResult {
  const result: PriceResult = {
    price: parseAmount(
      meta(html, 'og:price:amount') ?? meta(html, 'product:price:amount') ?? meta(html, 'og:price'),
    ),
    currency:
      (meta(html, 'og:price:currency') ?? meta(html, 'product:price:currency'))?.toUpperCase() ?? null,
  };

  if (result.price === null || result.currency === null) {
    const ld: PriceResult = { price: null, currency: null };
    for (const block of jsonLdBlocks(html)) collectLdPrice(block, ld);
    result.price = result.price ?? ld.price;
    result.currency = result.currency ?? ld.currency;
  }

  if (result.price === null || result.currency === null) {
    const microPrice = parseAmount(itemprop(html, 'price'));
    const microCurrency = itemprop(html, 'priceCurrency')?.toUpperCase() ?? null;
    result.price = result.price ?? microPrice;
    result.currency = result.currency ?? microCurrency;
  }

  if (result.price === null) {
    const dataPrice = html.match(/data-price=["']([^"']+)["']/i)?.[1] ?? null;
    result.price = parseAmount(dataPrice);
  }

  return fixCentsPrice(html, url, result);
}


function findTitle(html: string, url: string): string | null {
  const ldName = findLdProductName(jsonLdBlocks(html));
  if (ldName) return decode(ldName);

  const ogTitle = meta(html, 'og:title') ?? meta(html, 'twitter:title');
  if (ogTitle) return cleanSeoTitle(decode(ogTitle));

  const domTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null;
  if (domTitle) return cleanSeoTitle(decode(domTitle));

  const slug = slugTitle(url);
  return slug.length > 0 ? slug : null;
}


export async function resolveLink(url: string): Promise<ResolvedLink | null> {
  let html: string;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { ...BROWSER_HEADERS, Referer: url },
    });
    if (!response.ok) return null;
    html = (await response.text()).slice(0, 800_000);
  } catch {
    return null;
  }

  const title = findTitle(html, url);
  const imageUrl = meta(html, 'og:image') ?? meta(html, 'twitter:image');
  const { price, currency } = findPrice(html, url);

  if (!title) return null;

  return { title, imageUrl, price, currency };
}

