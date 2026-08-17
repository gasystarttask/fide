"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../types/ui";
import { LOCALE_STORAGE_KEY, resolveLocale } from "../services/localization";

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const resolved = resolveLocale();
    setLocale(resolved);
    document.documentElement.lang = resolved;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, resolved);
  }, []);

  return locale;
}
