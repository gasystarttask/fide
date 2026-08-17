import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "@search/app/privacy-policy/page";

describe("PrivacyPolicyPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the English policy content by default", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(/Cookies we use/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to app" })).toHaveAttribute("href", "/");
  });

  it("renders the French policy content when the locale is French", () => {
    window.localStorage.setItem("fide.ui.locale", "fr");

    render(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { name: "Politique de confidentialité" })).toBeInTheDocument();
  });
});
