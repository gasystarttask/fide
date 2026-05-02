import { beforeEach, describe, expect, it, vi } from "vitest";
import { COPY, LOCALE_STORAGE_KEY, normalizeLocale, resolveLocale } from "@search/app/services/localization";

describe("localization service", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("normalizes locale strings", () => {
    expect(normalizeLocale("fr")).toBe("fr");
    expect(normalizeLocale("fr-CA")).toBe("fr");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale(null)).toBe("en");
  });

  it("prefers saved locale from localStorage", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "fr");

    expect(resolveLocale()).toBe("fr");
  });

  it("falls back to browser locale when storage is empty", () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["fr-FR"]);

    expect(resolveLocale()).toBe("fr");
  });

  it("keeps key French labels localized", () => {
    expect(COPY.fr.title).toBe("Assistant biblique");
    expect(COPY.fr.entityChips).toBe("Entites");
    expect(COPY.fr.relationSnippets).toBe("Extraits de relations");
  });
});
