import type { CacheStore } from './types';

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class MemoryCache implements CacheStore {
  public readonly kind = 'memory' as const;

  private readonly store = new Map<string, Entry>();

  constructor(private readonly maxEntries: number = 2000) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (this.store.size >= this.maxEntries) this.prune();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
    if (this.store.size < this.maxEntries) return;

    const excess = this.store.size - this.maxEntries + 1;
    let removed = 0;
    for (const key of this.store.keys()) {
      if (removed >= excess) break;
      this.store.delete(key);
      removed += 1;
    }
  }
}
