import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeQuery } from "@search/lib/query-router";

describe("query-router French heuristics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  it("routes French direct-kinship query to fast genealogy profile", async () => {
    const result = await routeQuery({ query: "Qui est le fils de Joseph ?" });

    expect(result.source).toBe("heuristic");
    expect(result.intent).toBe("GENEALOGY");
    expect(result.vectorWeight).toBe(0.68);
    expect(result.graphWeight).toBe(0.17);
    expect(result.bm25Weight).toBe(0.15);
    expect(result.k).toBe(6);
  });

  it("extracts French book alias and canonicalizes to LSG French book name", async () => {
    const result = await routeQuery({ query: "Abraham en Egypte dans Genese" });

    expect(result.filters?.book).toBe("Genèse");
    expect(result.filters?.testament).toBe("Ancien Testament");
  });

  it("routes French geography query to hybrid profile", async () => {
    const result = await routeQuery({ query: "Ou Abraham est-il situe en Egypte ?" });

    expect(result.intent).toBe("GEOGRAPHY");
    expect(result.vectorWeight).toBe(0.3);
    expect(result.graphWeight).toBe(0.3);
    expect(result.bm25Weight).toBe(0.4);
  });

  it("applies chronology bm25 tuning", async () => {
    const result = await routeQuery({ query: "Quand David regna-t-il ?" });

    expect(result.intent).toBe("CHRONOLOGY");
    expect(result.bm25Weight).toBe(0.25);
  });

  it("applies theology bm25 tuning", async () => {
    const result = await routeQuery({ query: "Que dit la Bible sur la grace ?" });

    expect(result.intent).toBe("THEOLOGY");
    expect(result.bm25Weight).toBe(0.3);
  });

  it("applies general bm25 tuning", async () => {
    const result = await routeQuery({ query: "Parle-moi d'Abraham" });

    expect(result.intent).toBe("GENERAL");
    expect(result.bm25Weight).toBe(0.4);
  });
});
