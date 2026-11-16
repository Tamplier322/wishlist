import { useCallback, useEffect, useState } from 'react';

export const CURRENCIES = ['BYN', 'USD', 'EUR', 'RUB'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'BYN';

const BASE_KEY = 'wl_base_currency';
const RATES_KEY = 'wl_rates';
const OVERRIDES_KEY = 'wl_rates_override';

export const RATES_TTL_MS = 12 * 60 * 60 * 1000;
export const RATES_SOURCE = 'open.er-api.com';

const CURRENCY_SYMBOLS: Record<Currency, string> = { BYN: 'Br', USD: '$', EUR: '€', RUB: '₽' };

function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export function getBaseCurrency(): Currency {
  try {
    const stored = localStorage.getItem(BASE_KEY);
    return isCurrency(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function setBaseCurrency(currency: Currency): void {
  try {
    localStorage.setItem(BASE_KEY, currency);
  } catch {
    void 0;
  }
  notifyListeners();
}

export interface Rates {
  rates: Record<string, number>;
  fetchedAt: number;
  source: string;
  stale: boolean;
}

interface StoredRates {
  rates: Record<string, number>;
  fetchedAt: number;
  source?: string;
}


export function getRateOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [currency, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        result[currency] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function setRateOverride(currency: string, rate: number | null): void {
  const overrides = getRateOverrides();
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    delete overrides[currency];
  } else {
    overrides[currency] = rate;
  }
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    void 0;
  }
  notifyListeners();
}

export function clearRateOverrides(): void {
  try {
    localStorage.removeItem(OVERRIDES_KEY);
  } catch {
    void 0;
  }
  notifyListeners();
}

function applyOverrides(rates: Record<string, number>): Record<string, number> {
  return { ...rates, ...getRateOverrides() };
}


let ratesPromise: Promise<Rates | null> | null = null;

function readCachedRates(): StoredRates | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRates;
    if (!parsed || typeof parsed.rates !== 'object' || typeof parsed.fetchedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function decorate(stored: StoredRates, stale = false): Rates {
  return {
    rates: applyOverrides(stored.rates),
    fetchedAt: stored.fetchedAt,
    source: stored.source ?? RATES_SOURCE,
    stale,
  };
}

async function loadRates(force = false): Promise<Rates | null> {
  const cached = readCachedRates();
  if (!force && cached && Date.now() - cached.fetchedAt < RATES_TTL_MS) {
    return decorate(cached);
  }
  try {
    const response = await fetch(`https://${RATES_SOURCE}/v6/latest/USD`);
    if (!response.ok) throw new Error(`Rates request failed: ${response.status}`);
    const json = (await response.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result === 'success' && json.rates) {
      const fresh: StoredRates = {
        rates: json.rates,
        fetchedAt: Date.now(),
        source: RATES_SOURCE,
      };
      try {
        localStorage.setItem(RATES_KEY, JSON.stringify(fresh));
      } catch {
        void 0;
      }
      notifyListeners();
      return decorate(fresh);
    }
    throw new Error('Unexpected rates payload');
  } catch {
    return cached ? decorate(cached, true) : null;
  }
}

export function getRates(): Promise<Rates | null> {
  if (!ratesPromise) ratesPromise = loadRates();
  return ratesPromise;
}

export function refreshRates(): Promise<Rates | null> {
  ratesPromise = loadRates(true);
  return ratesPromise;
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Rates | null,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  if (!rates) return null;
  const fromRate = from === 'USD' ? 1 : rates.rates[from];
  const toRate = to === 'USD' ? 1 : rates.rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}


function currentLocale(): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang) return lang;
  }
  return 'ru-RU';
}

export function currencySymbol(currency: string, locale?: string): string {
  const loc = locale ?? currentLocale();
  try {
    const parts = new Intl.NumberFormat(loc, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const value = parts.find((part) => part.type === 'currency')?.value;
    if (value) return value;
  } catch {
    void 0;
  }
  return CURRENCY_SYMBOLS[currency as Currency] ?? currency;
}

export function formatMoney(amount: number, currency: string, locale?: string): string {
  const loc = locale ?? currentLocale();
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString(loc)
    : rounded.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${text} ${currencySymbol(currency, loc)}`;
}

export function formatMoneyIntl(amount: number, currency: string, locale?: string): string {
  const loc = locale ?? currentLocale();
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return formatMoney(amount, currency, loc);
  }
}

export interface CurrencyState {
  base: Currency;
  rates: Rates | null;
  fetchedAt: number | null;
  source: string | null;
  stale: boolean;
  refresh: () => void;
}

export function useCurrency(): CurrencyState {
  const [base, setBase] = useState<Currency>(getBaseCurrency);
  const [rates, setRates] = useState<Rates | null>(() => {
    const cached = readCachedRates();
    return cached && Date.now() - cached.fetchedAt < RATES_TTL_MS ? decorate(cached) : null;
  });

  const refresh = useCallback(() => {
    void refreshRates().then((fresh) => {
      if (fresh) setRates(fresh);
    });
  }, []);

  useEffect(() => {
    const listener = (): void => {
      setBase(getBaseCurrency());
      const cached = readCachedRates();
      if (cached) setRates(decorate(cached));
    };
    listeners.add(listener);
    let alive = true;
    getRates().then((fresh) => {
      if (alive && fresh) setRates(fresh);
    });
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);

  return {
    base,
    rates,
    fetchedAt: rates?.fetchedAt ?? null,
    source: rates?.source ?? null,
    stale: rates?.stale ?? false,
    refresh,
  };
}
