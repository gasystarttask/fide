import { bench, describe } from "vitest";
import { getDb } from "@search/lib/mongodb";
import { HybridRetriever } from "@search/lib/hybrid-retriever";

const runBench = process.env.RUN_HYBRID_BENCH === "true";
const describeBench = runBench ? describe : describe.skip;

describeBench("benchmark: hybrid retrieval", () => {
  let retriever: HybridRetriever;

  bench("vector only baseline", async () => {
    if (!retriever) {
      retriever = new HybridRetriever(await getDb());
    }

    await retriever.retrieve("Abraham", 5, 1, 0, 0, undefined, 0);
  });

  bench("bm25 weighted retrieval", async () => {
    if (!retriever) {
      retriever = new HybridRetriever(await getDb());
    }

    await retriever.retrieve("Abraham", 5, 0.48, 0.12, 0, undefined, 0.4);
  });

  bench("3-way hybrid retrieval", async () => {
    if (!retriever) {
      retriever = new HybridRetriever(await getDb());
    }

    await retriever.retrieve("Abraham", 5, 0.48, 0.12, 0, undefined, 0.4);
  });
});
