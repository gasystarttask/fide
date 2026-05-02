import { describe, expect, it } from "vitest";
import { buildRelationSnippets } from "@search/app/services/relationSnippets";
import { COPY } from "@search/app/services/localization";

describe("relation snippets service", () => {
  it("builds snippets with localized templates", () => {
    const snippets = buildRelationSnippets(
      [
        {
          slug: "abraham",
          name: "Abraham",
          type: "person",
          relations: [
            { type: "FATHER_OF", targetName: "Isaac", targetSlug: "isaac" },
            { type: "TRAVELS_TO", targetName: "Canaan", targetSlug: "canaan" },
          ],
        },
      ],
      COPY.en
    );

    expect(snippets).toEqual(["Abraham is the father of Isaac.", "Abraham travels to Canaan."]);
  });

  it("deduplicates equivalent snippets and applies max limit", () => {
    const snippets = buildRelationSnippets(
      [
        {
          slug: "abraham",
          name: "Abraham",
          type: "person",
          relations: [
            { type: "FATHER_OF", targetName: "Isaac", targetSlug: "isaac" },
            { type: "FATHER_OF", targetName: "Isaac", targetSlug: "isaac-2" },
            { type: "FATHER_OF", targetName: "Ishmael", targetSlug: "ishmael" },
          ],
        },
      ],
      COPY.en,
      2
    );

    expect(snippets).toEqual(["Abraham is the father of Isaac.", "Abraham is the father of Ishmael."]);
  });

  it("uses fallback for unknown relation types", () => {
    const snippets = buildRelationSnippets(
      [
        {
          slug: "moses",
          name: "Moses",
          type: "person",
          relations: [{ type: "SENT_TO", targetName: "Pharaoh", targetSlug: "pharaoh" }],
        },
      ],
      COPY.en
    );

    expect(snippets[0]).toBe("Moses is related to Pharaoh (sent to).");
  });
});
