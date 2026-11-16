import type { CacheStore } from './types';

interface RedisRestResponse<T> {
  result: T;
}

export class RedisRestCache implements CacheStore {
  public readonly kind = 'redis-rest' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fallback: CacheStore,
    private readonly timeoutMs: number = 1500,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.command<string | null>(`/get/${encodeURIComponent(key)}`);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return this.fallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const seconds = Math.max(1, Math.ceil(ttlMs / 1000));
    try {
      await this.command(`/set/${encodeURIComponent(key)}?EX=${seconds}`, {
        method: 'POST',
        body: JSON.stringify(value),
      });
    } catch {
      await this.fallback.set(key, value, ttlMs);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.command(`/del/${encodeURIComponent(key)}`, { method: 'POST' });
    } catch {
      await this.fallback.delete(key);
    }
  }

  private async command<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Redis REST ${response.status}`);
      }
      const data = (await response.json()) as RedisRestResponse<T>;
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }
}
