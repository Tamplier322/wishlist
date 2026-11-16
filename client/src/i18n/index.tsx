import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ru, type Dictionary } from './ru';
import { en } from './en';

export type Lang = 'ru' | 'en';

const DICTIONARIES: Record<Lang, Dictionary> = { ru, en };

const LANG_KEY = 'wl_lang';


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
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(DICTIONARIES[lang], key, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useT must be used within I18nProvider');
  return context;
}
