import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@search/app/components/Footer";
import { LOCALE_STORAGE_KEY } from "@search/app/services/localization";

describe("Footer", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("links to the privacy policy page", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy"
    );
  });

  it("uses localized link text", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "fr");

    render(<Footer />);

    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toBeInTheDocument();
  });
});
