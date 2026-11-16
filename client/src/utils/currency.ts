import { useEffect, useState } from 'react';



export const CURRENCIES = ['BYN', 'USD', 'EUR', 'RUB'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'BYN';

const BASE_KEY = 'wl_base_currency';
const RATES_KEY = 'wl_rates';
const RATES_TTL_MS = 12 * 60 * 60 * 1000;

const CURRENCY_SYMBOLS: Record<Currency, string> = { BYN: 'Br', USD: '$', EUR: '€', RUB: '₽' };

function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as Currency] ?? currency;
}

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
}

let ratesPromise: Promise<Rates | null> | null = null;

function readCachedRates(): Rates | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    return raw ? (JSON.parse(raw) as Rates) : null;
  } catch {
    return null;
  }
}

async function loadRates(): Promise<Rates | null> {
  const cached = readCachedRates();
  if (cached && Date.now() - cached.fetchedAt < RATES_TTL_MS) return cached;
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = (await response.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result === 'success' && json.rates) {
      const fresh: Rates = { rates: json.rates, fetchedAt: Date.now() };
      try {
        localStorage.setItem(RATES_KEY, JSON.stringify(fresh));
      } catch {
        void 0;
      }
      notifyListeners();
      return fresh;
    }
  } catch {
    void 0;
  }
  return cached;
}


export function getRates(): Promise<Rates | null> {
  if (!ratesPromise) ratesPromise = loadRates();
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


export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString('ru-RU')
    : rounded.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${text} ${currencySymbol(currency)}`;
}


export function useCurrency(): { base: Currency; rates: Rates | null } {
  const [base, setBase] = useState<Currency>(getBaseCurrency);
  const [rates, setRates] = useState<Rates | null>(() => {
    const cached = readCachedRates();
    return cached && Date.now() - cached.fetchedAt < RATES_TTL_MS ? cached : null;
  });

  useEffect(() => {
    const listener = (): void => setBase(getBaseCurrency());
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

  return { base, rates };
}
