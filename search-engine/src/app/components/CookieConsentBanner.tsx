"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/Button";
import { COPY } from "../services/localization";
import { useLocale } from "../hooks/useLocale";
import {
  persistCookieConsent,
  resolveCookieConsent,
  type CookieConsentStatus,
} from "../services/cookieConsent";

const BANNER_HEIGHT_CSS_VAR = "--cookie-banner-height";

export function CookieConsentBanner() {
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisible(resolveCookieConsent() === null);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const el = bannerRef.current;

    if (!visible || !el) {
      root.style.setProperty(BANNER_HEIGHT_CSS_VAR, "0px");
      return;
    }

    const updateHeight = () => root.style.setProperty(BANNER_HEIGHT_CSS_VAR, `${el.offsetHeight}px`);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    return () => {
      observer.disconnect();
      root.style.setProperty(BANNER_HEIGHT_CSS_VAR, "0px");
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const uiText = COPY[locale];

  function choose(status: CookieConsentStatus) {
    persistCookieConsent(status);
    setVisible(false);
  }

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label={uiText.cookieBannerTitle}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface px-3 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-b4 text-medium-gray">
          {uiText.cookieBannerMessage}{" "}
          <Link href="/privacy-policy" className="text-primary underline hover:text-primary-hover">
            {uiText.privacyPolicyLink}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => choose("rejected")}>
            {uiText.cookieRejectNonEssential}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => choose("accepted")}>
            {uiText.cookieAcceptAll}
          </Button>
        </div>
      </div>
    </div>
  );
}
