export type QueryIntent =
  | "THEOLOGY"
  | "GENEALOGY"
  | "GEOGRAPHY"
  | "CHRONOLOGY"
  | "GENERAL";

export interface HybridFilters {
  testament?: "Old Testament" | "New Testament" | "Ancien Testament" | "Nouveau Testament";
  book?: string;
}

export interface HybridSearchRequest {
  query: string;
  k?: number;
  vectorWeight?: number;
  graphWeight?: number;
  bm25Weight?: number;
  filters?: HybridFilters;
  minScore?: number;
}

export interface VerseResult {
  id: string;
  text: string;
  reference: string;
  score: number;
  source: "vector" | "graph" | "bm25" | "hybrid";
}

export interface EntityFact {
  slug: string;
  name: string;
  type: string;
  description?: string;
  aliases?: string[];
  relations?: {
    type: string;
    targetName: string;
    targetSlug: string;
  }[];
}

export interface HybridSearchResponse {
  verses: VerseResult[];
  entityFacts: EntityFact[];
  query: string;
  metadata: {
    vectorWeight: number;
    graphWeight: number;
    bm25Weight: number;
    totalVectorResults: number;
    totalGraphResults: number;
    totalBM25Results: number;
    processingTimeMs: number;
    routing?: {
      intent: QueryIntent;
      source: "llm" | "heuristic";
      reasoning: string;
      latencyMs: number;
      filters?: HybridFilters;
      k: number;
      bm25Weight?: number;
      bm25Disabled?: boolean;
    };
  };
}