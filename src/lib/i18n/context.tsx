import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, type Dictionary, type Locale } from "./translations";

const STORAGE_KEY = "shoghlni.locale";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  setLocale: (l: Locale) => void;
  hydrated: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Detect: saved choice -> device language -> Arabic fallback. */
function detectLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "ar" || saved === "en") return saved;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    if (!l) continue;
    if (l.toLowerCase().startsWith("ar")) return "ar";
    if (l.toLowerCase().startsWith("en")) return "en";
  }
  return "ar";
}

function applyToDocument(locale: Locale) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Server and first client render agree on "ar"; the real locale is applied after hydration.
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    applyToDocument(detected);
    setHydrated(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    applyToDocument(l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, dir: locale === "ar" ? "rtl" : "ltr", t: dictionaries[locale], setLocale, hydrated }),
    [locale, setLocale, hydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(n);
}

export function formatDate(d: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" }).format(
    new Date(d),
  );
}
