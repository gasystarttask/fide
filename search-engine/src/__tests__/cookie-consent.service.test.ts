import { beforeEach, describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  persistCookieConsent,
  resolveCookieConsent,
} from "@search/app/services/cookieConsent";

describe("cookie consent service", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no choice has been recorded", () => {
    expect(resolveCookieConsent()).toBeNull();
  });

  it("persists and resolves an accepted choice", () => {
    persistCookieConsent("accepted");

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
    expect(resolveCookieConsent()).toBe("accepted");
  });

  it("persists and resolves a rejected choice", () => {
    persistCookieConsent("rejected");

    expect(resolveCookieConsent()).toBe("rejected");
  });

  it("ignores unrecognized stored values", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "garbage");

    expect(resolveCookieConsent()).toBeNull();
  });
});
