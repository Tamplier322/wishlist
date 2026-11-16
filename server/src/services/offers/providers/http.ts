const DEFAULT_TIMEOUT_MS = 8000;


export async function fetchJson<T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',

        'User-Agent': 'WishlistApp/1.0',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}


export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}
