import { describe, expect, it, vi } from "vitest";

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      embeddings = {
        create: vi.fn(),
      };
    },
  };
});

async function getHybridRetrieverClass() {
  const mod = await import("@search/lib/hybrid-retriever");
  return mod.HybridRetriever;
}

async function createRetriever() {
  const HybridRetriever = await getHybridRetrieverClass();
  const db = {
    collection: vi.fn().mockReturnValue({
      find: vi.fn(),
      aggregate: vi.fn(),
    }),
  };

  return new HybridRetriever(db as never);
}

describe("hybrid-retriever.retrieve", () => {
  it("normalizes three-way weights when input sum is not 1.0", async () => {
    const retriever = await createRetriever();

    vi.spyOn(retriever, "vectorSearch").mockResolvedValue([
      {
        id: "b.GEN.1.1",
        reference: "Genèse 1:1",
        text: "Au commencement...",
        score: 1,
        source: "vector",
        entitySlugs: ["abraham"],
      },
    ] as never);
    vi.spyOn(retriever, "graphSearch").mockResolvedValue([]);
    vi.spyOn(retriever, "bm25Search").mockResolvedValue([]);
    vi.spyOn(retriever, "augmentWithEntityFacts").mockResolvedValue([]);

    const result = await retriever.retrieve("creation", 5, 2, 1, 0, undefined, 0.5);
    const total = result.metadata.vectorWeight + result.metadata.graphWeight + result.metadata.bm25Weight;

    expect(total).toBe(1);
    expect(result.metadata.vectorWeight).toBeGreaterThan(0);
    expect(result.metadata.graphWeight).toBeGreaterThan(0);
    expect(result.metadata.bm25Weight).toBeGreaterThan(0);
  });

  it("fuses vector, graph, and bm25 results with deduplication", async () => {
    const retriever = await createRetriever();

    vi.spyOn(retriever, "vectorSearch").mockResolvedValue([
      {
        id: "b.GEN.1.1",
        reference: "Genèse 1:1",
        text: "Au commencement...",
        score: 1,
        source: "vector",
        entitySlugs: ["abraham"],
      },
    ] as never);

    vi.spyOn(retriever, "graphSearch").mockResolvedValue([
      {
        id: "b.GEN.1.1",
        reference: "Genèse 1:1",
        text: "Au commencement...",
        score: 0.9,
        source: "graph",
        entitySlugs: ["abraham"],
      },
      {
        id: "b.GEN.1.2",
        reference: "Genèse 1:2",
        text: "La terre était informe...",
        score: 0.7,
        source: "graph",
        entitySlugs: ["terre"],
      },
    ] as never);

    vi.spyOn(retriever, "bm25Search").mockResolvedValue([
      {
        id: "b.GEN.1.2",
        reference: "Genèse 1:2",
        text: "La terre était informe...",
        score: 1,
        source: "bm25",
        entitySlugs: ["terre"],
      },
    ] as never);

    vi.spyOn(retriever, "augmentWithEntityFacts").mockResolvedValue([]);

    const result = await retriever.retrieve("terre informe", 5, 0.5, 0.2, 0, undefined, 0.3);

    expect(result.verses.length).toBe(2);
    expect(result.verses.every((v) => v.source === "hybrid")).toBe(true);
    expect(result.metadata.totalVectorResults).toBe(1);
    expect(result.metadata.totalGraphResults).toBe(2);
    expect(result.metadata.totalBM25Results).toBe(1);
  });

  it("supports graceful degradation when bm25 returns no hits", async () => {
    const retriever = await createRetriever();

    vi.spyOn(retriever, "vectorSearch").mockResolvedValue([
      {
        id: "b.GEN.1.1",
        reference: "Genèse 1:1",
        text: "Au commencement...",
        score: 1,
        source: "vector",
        entitySlugs: ["abraham"],
      },
    ] as never);
    vi.spyOn(retriever, "graphSearch").mockResolvedValue([]);
    vi.spyOn(retriever, "bm25Search").mockResolvedValue([]);
    vi.spyOn(retriever, "augmentWithEntityFacts").mockResolvedValue([]);

    const result = await retriever.retrieve("creation", 5, 0.7, 0.2, 0, undefined, 0.1);

    expect(result.verses.length).toBeGreaterThan(0);
    expect(result.metadata.totalBM25Results).toBe(0);
  });
});
