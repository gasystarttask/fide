import { describe, expect, it } from "vitest";

const runLive = process.env.RUN_LIVE_HYBRID_TESTS === "true";
const describeLive = runLive ? describe : describe.skip;

async function getLiveDeps() {
  const [{ getDb }, { HybridRetriever }, { ensureMeilisearchIndexes }] = await Promise.all([
    import("@search/lib/mongodb"),
    import("@search/lib/hybrid-retriever"),
    import("@search/lib/meilisearch-client"),
  ]);

  return { getDb, HybridRetriever, ensureMeilisearchIndexes };
}

describeLive("integration: hybrid retriever with mongodb + meilisearch", () => {
  it("returns fused results from vector/graph/bm25 without breaking schema", async () => {
    const { getDb, HybridRetriever, ensureMeilisearchIndexes } = await getLiveDeps();
    const db = await getDb();
    await ensureMeilisearchIndexes();

    const retriever = new HybridRetriever(db);
    const result = await retriever.retrieve(
      "Abraham en Egypte",
      6,
      0.48,
      0.12,
      0,
      { book: "Genèse", testament: "Ancien Testament" },
      0.4
    );

    expect(result.verses.length).toBeGreaterThan(0);
    expect(result.metadata.vectorWeight + result.metadata.graphWeight + result.metadata.bm25Weight).toBe(1);
    expect(result.metadata.totalBM25Results).toBeGreaterThanOrEqual(0);
  });

  it("supports disableBM25 scenario while preserving retrieval", async () => {
    const { getDb, HybridRetriever } = await getLiveDeps();
    const db = await getDb();
    const retriever = new HybridRetriever(db);

    const withBm25 = await retriever.retrieve("Jésus", 5, 0.63, 0.07, 0, undefined, 0.3);
    const withoutBm25 = await retriever.retrieve("Jésus", 5, 0.63, 0.07, 0, undefined, 0);

    expect(withoutBm25.verses.length).toBeGreaterThan(0);
    expect(withoutBm25.metadata.totalBM25Results).toBe(0);
    expect(withBm25.verses.length).toBeGreaterThan(0);
  });
});
