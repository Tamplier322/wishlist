import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ru, type Dictionary } from './ru';
import { en } from './en';

export type Lang = 'ru' | 'en';

const DICTIONARIES: Record<Lang, Dictionary> = { ru, en };

const LANG_META: Record<Lang, { htmlLang: string; dir: 'ltr' | 'rtl' }> = {
  ru: { htmlLang: 'ru', dir: 'ltr' },
  en: { htmlLang: 'en', dir: 'ltr' },
};

const LANG_KEY = 'wl_lang';

type KeyPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${KeyPaths<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = KeyPaths<Dictionary>;

function loadLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'ru' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}


function translate(dict: Dictionary, key: string, vars?: Record<string, string | number>): string {
  const raw = key
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc !== null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      dict,
    );
  const template = typeof raw === 'string' ? raw : key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  plural: (count: number) => Intl.LDMLPluralRule;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANG_META[lang].htmlLang;
    document.documentElement.dir = LANG_META[lang].dir;
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(DICTIONARIES[lang], key, vars),
    [lang],
  );

  const pluralRules = useMemo(() => new Intl.PluralRules(lang), [lang]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: '2-digit', month: 'long', year: 'numeric' }),
    [lang],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    [lang],
  );

  const plural = useCallback((count: number) => pluralRules.select(count), [pluralRules]);

  const formatDate = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return (options ? new Intl.DateTimeFormat(lang, options) : dateFormatter).format(date);
    },
    [lang, dateFormatter],
  );

  const formatDateTime = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return (options ? new Intl.DateTimeFormat(lang, options) : dateTimeFormatter).format(date);
    },
    [lang, dateTimeFormatter],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, plural, formatDate, formatDateTime }),
    [lang, setLang, t, plural, formatDate, formatDateTime],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useT must be used within I18nProvider');
  return context;
}
