const TOKEN_KEY = 'wl_token';
const REFRESH_KEY = 'wl_refresh';

export interface TokenPair {
  token: string;
  refreshToken?: string;
}

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh(): string | null {
    localStorage.removeItem(REFRESH_KEY);
    return null;
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(REFRESH_KEY);
  },
  setPair(pair: TokenPair): void {
    localStorage.setItem(TOKEN_KEY, pair.token);
    localStorage.removeItem(REFRESH_KEY);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
