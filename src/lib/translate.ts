// Shim italiano-only di react-i18next.
// Risolve le chiavi puntate (es. "landing.tag") direttamente dal JSON italiano,
// in modo completamente sincrono — niente init asincrono, niente Suspense, niente
// chiavi grezze mostrate in SSR.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import it from "../locales/it.json";
import en from "../locales/en.json";

type Dict = Record<string, unknown>;
const DICTS: Record<string, Dict> = { it: it as Dict, en: en as Dict };

const LISTENERS = new Set<() => void>();
let currentLang: "it" | "en" = "it";

function getLang(): "it" | "en" {
  return currentLang;
}

function setLang(lng: string) {
  const next = lng === "en" ? "en" : "it";
  if (next === currentLang) return;
  currentLang = next;
  LISTENERS.forEach((l) => l());
}

function subscribe(cb: () => void) {
  LISTENERS.add(cb);
  return () => {
    LISTENERS.delete(cb);
  };
}

function lookup(dict: Dict, key: string): unknown {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Dict)) {
      cur = (cur as Dict)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function interpolate(str: string, vars?: Record<string, unknown>): string {
  if (!vars) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export type TFunction = (key: string, vars?: Record<string, unknown>) => string;

export interface I18nLike {
  language: "it" | "en";
  resolvedLanguage: "it" | "en";
  changeLanguage: (lng: string) => Promise<void>;
}

export function useTranslation(): { t: TFunction; i18n: I18nLike } {
  const lang = useSyncExternalStore(subscribe, getLang, () => "it" as const);

  const t = useCallback<TFunction>(
    (key, vars) => {
      const primary = lookup(DICTS[lang], key);
      const value = typeof primary === "string" ? primary : lookup(DICTS.it, key);
      if (typeof value === "string") return interpolate(value, vars);
      return key;
    },
    [lang],
  );

  const i18n = useMemo<I18nLike>(
    () => ({
      language: lang,
      resolvedLanguage: lang,
      changeLanguage: async (lng: string) => {
        setLang(lng);
      },
    }),
    [lang],
  );

  return { t, i18n };
}
