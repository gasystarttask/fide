export type CookieConsentStatus = "accepted" | "rejected";

export const COOKIE_CONSENT_STORAGE_KEY = "fide.cookie-consent";

export function resolveCookieConsent(): CookieConsentStatus | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

export function persistCookieConsent(status: CookieConsentStatus): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
}
