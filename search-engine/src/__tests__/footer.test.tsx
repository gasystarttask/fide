import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@search/app/components/Footer";
import { COPY } from "@search/app/services/localization";

describe("Footer", () => {
  it("links to the privacy policy page", () => {
    render(<Footer uiText={COPY.en} />);

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy"
    );
  });

  it("uses localized link text", () => {
    render(<Footer uiText={COPY.fr} />);

    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toBeInTheDocument();
  });
});
