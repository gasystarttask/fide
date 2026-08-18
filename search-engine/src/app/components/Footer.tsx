"use client";

import Link from "next/link";
import { COPY } from "../services/localization";
import { useLocale } from "../hooks/useLocale";

export function Footer() {
  const locale = useLocale();
  const uiText = COPY[locale];

  return (
    <footer className="mx-auto w-full max-w-6xl px-3 pb-[calc(1rem+var(--cookie-banner-height))] pt-4 text-center sm:px-6">
      <Link
        href="/privacy-policy"
        className="text-b4 text-medium-gray underline hover:text-main"
      >
        {uiText.privacyPolicyLink}
      </Link>
    </footer>
  );
}
