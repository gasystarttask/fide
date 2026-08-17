import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CookieConsentBanner } from "@search/app/components/CookieConsentBanner";
import { COOKIE_CONSENT_STORAGE_KEY } from "@search/app/services/cookieConsent";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the banner with a link to the privacy policy when no choice was recorded", () => {
    render(<CookieConsentBanner />);

    expect(screen.getByRole("region", { name: "Cookies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy"
    );
  });

  it("does not render when a choice was already recorded", () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "accepted");

    const { container } = render(<CookieConsentBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("persists acceptance and hides the banner", () => {
    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Accept all" }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("accepted");
    expect(screen.queryByRole("region", { name: "Cookies" })).not.toBeInTheDocument();
  });

  it("persists rejection and hides the banner", () => {
    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Reject non-essential" }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe("rejected");
    expect(screen.queryByRole("region", { name: "Cookies" })).not.toBeInTheDocument();
  });
});
