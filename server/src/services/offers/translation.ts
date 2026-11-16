import { fetchJson } from './providers/http';

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
  responseStatus?: number;
}

const cache = new Map<string, string | null>();
const CYRILLIC = /[\u0400-\u04FF]/;

export async function translateToEnglish(query: string): Promise<string | null> {
  if (!CYRILLIC.test(query)) return null;

  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url =
      'https://api.mymemory.translated.net/get' +
      `?q=${encodeURIComponent(query)}` +
      '&langpair=ru|en';

    const data = await fetchJson<MyMemoryResponse>(url, 4000);
    const translated = data.responseData?.translatedText?.trim() ?? '';
    const result =
      translated && translated.toLowerCase() !== key ? translated : null;

    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
