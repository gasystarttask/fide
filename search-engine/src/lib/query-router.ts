import { registerDefaultLlmProviders } from "@search/lib/llm/providers";
import { executeWithFallback } from "@search/lib/llm/resilience";
import type { HybridFilters, QueryIntent } from "@search/types/hybrid";

registerDefaultLlmProviders();

const PERF_TRACE_ENABLED =
  process.env.LLM_PERF_TRACE === "true" || process.env.NODE_ENV !== "production";

function logPerf(event: string, payload: Record<string, unknown>): void {
  if (!PERF_TRACE_ENABLED) {
    return;
  }

  console.info(`[perf][query-router][${event}]`, payload);
}

type RouterDecisionShape = {
  intent: QueryIntent;
  vectorWeight: number;
  graphWeight: number;
  bm25Weight: number;
  k: number;
  filters?: HybridFilters;
  reasoning: string;
};

export interface QueryRoutingDecision extends RouterDecisionShape {
  source: "llm" | "heuristic";
  latencyMs: number;
}

export interface QueryRouterInput {
  query: string;
  requested?: {
    k?: number;
    vectorWeight?: number;
    graphWeight?: number;
    bm25Weight?: number;
    filters?: HybridFilters;
  };
  timeoutMs?: number;
}

const ROUTER_MODEL = process.env.QUERY_ROUTER_MODEL ?? "gpt-4o-mini";
const ROUTER_TIMEOUT_MS = 450;
const ROUTE_CACHE_TTL_MS = 60 * 1000;

type RouteCacheEntry = {
  value: QueryRoutingDecision;
  expiresAt: number;
};

declare global {
  var __queryRouterCache: Map<string, RouteCacheEntry> | undefined;
  var __queryRouterInFlight: Map<string, Promise<QueryRoutingDecision>> | undefined;
}

const routeCache = global.__queryRouterCache ?? (global.__queryRouterCache = new Map<string, RouteCacheEntry>());
const routeInFlight =
  global.__queryRouterInFlight ??
  (global.__queryRouterInFlight = new Map<string, Promise<QueryRoutingDecision>>());

const LSG_BOOK_NAMES: Record<string, string> = {
  Genesis: "Genèse",
  Exodus: "Exode",
  Leviticus: "Lévitique",
  Numbers: "Nombres",
  Deuteronomy: "Deutéronome",
  Joshua: "Josué",
  Judges: "Juges",
  Ruth: "Ruth",
  "1 Samuel": "1 Samuel",
  "2 Samuel": "2 Samuel",
  "1 Kings": "1 Rois",
  "2 Kings": "2 Rois",
  "1 Chronicles": "1 Chroniques",
  "2 Chronicles": "2 Chroniques",
  Ezra: "Esdras",
  Nehemiah: "Néhémie",
  Esther: "Esther",
  Job: "Job",
  Psalms: "Psaumes",
  Proverbs: "Proverbes",
  Ecclesiastes: "Ecclésiaste",
  "Song of Solomon": "Cantique des Cantiques",
  Isaiah: "Ésaïe",
  Jeremiah: "Jérémie",
  Lamentations: "Lamentations",
  Ezekiel: "Ézéchiel",
  Daniel: "Daniel",
  Hosea: "Osée",
  Joel: "Joël",
  Amos: "Amos",
  Obadiah: "Abdias",
  Jonah: "Jonas",
  Micah: "Michée",
  Nahum: "Nahum",
  Habakkuk: "Habacuc",
  Zephaniah: "Sophonie",
  Haggai: "Aggée",
  Zechariah: "Zacharie",
  Malachi: "Malachie",
  Matthew: "Matthieu",
  Mark: "Marc",
  Luke: "Luc",
  John: "Jean",
  Acts: "Actes",
  Romans: "Romains",
  "1 Corinthians": "1 Corinthiens",
  "2 Corinthians": "2 Corinthiens",
  Galatians: "Galates",
  Ephesians: "Éphésiens",
  Philippians: "Philippiens",
  Colossians: "Colossiens",
  "1 Thessalonians": "1 Thessaloniciens",
  "2 Thessalonians": "2 Thessaloniciens",
  "1 Timothy": "1 Timothée",
  "2 Timothy": "2 Timothée",
  Titus: "Tite",
  Philemon: "Philémon",
  Hebrews: "Hébreux",
  James: "Jacques",
  "1 Peter": "1 Pierre",
  "2 Peter": "2 Pierre",
  "1 John": "1 Jean",
  "2 John": "2 Jean",
  "3 John": "3 Jean",
  Jude: "Jude",
  Revelation: "Apocalypse",
};

const NEW_TESTAMENT_KEYS = new Set([
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
]);

const INTENT_CONFIG: Record<QueryIntent, Pick<RouterDecisionShape, "vectorWeight" | "graphWeight" | "bm25Weight" | "k">> = {
  THEOLOGY: { vectorWeight: 0.63, graphWeight: 0.07, bm25Weight: 0.3, k: 5 },
  GENEALOGY: { vectorWeight: 0.15, graphWeight: 0.7, bm25Weight: 0.15, k: 6 },
  GEOGRAPHY: { vectorWeight: 0.3, graphWeight: 0.3, bm25Weight: 0.4, k: 8 },
  CHRONOLOGY: { vectorWeight: 0.35, graphWeight: 0.4, bm25Weight: 0.25, k: 8 },
  GENERAL: { vectorWeight: 0.48, graphWeight: 0.12, bm25Weight: 0.4, k: 5 },
};

const BOOK_ALIASES: Record<string, string[]> = {
  Genesis: ["genesis", "genese"],
  Exodus: ["exodus", "exode"],
  Leviticus: ["leviticus", "levitique"],
  Numbers: ["numbers", "nombres"],
  Deuteronomy: ["deuteronomy", "deuteronome"],
  Joshua: ["joshua", "josue"],
  Judges: ["judges", "juges"],
  Ruth: ["ruth"],
  "1 Samuel": ["1 samuel", "1 sam"],
  "2 Samuel": ["2 samuel", "2 sam"],
  "1 Kings": ["1 kings", "1 rois"],
  "2 Kings": ["2 kings", "2 rois"],
  "1 Chronicles": ["1 chronicles", "1 chroniques"],
  "2 Chronicles": ["2 chronicles", "2 chroniques"],
  Ezra: ["ezra", "esdras"],
  Nehemiah: ["nehemiah", "nehemie"],
  Esther: ["esther"],
  Job: ["job"],
  Psalms: ["psalms", "psaumes", "psaume"],
  Proverbs: ["proverbs", "proverbes"],
  Ecclesiastes: ["ecclesiastes", "ecclesiaste"],
  "Song of Solomon": ["song of solomon", "cantique des cantiques", "cantique"],
  Isaiah: ["isaiah", "esaie"],
  Jeremiah: ["jeremiah", "jeremie"],
  Lamentations: ["lamentations"],
  Ezekiel: ["ezekiel", "ezechiel"],
  Daniel: ["daniel"],
  Hosea: ["hosea", "osee"],
  Joel: ["joel"],
  Amos: ["amos"],
  Obadiah: ["obadiah", "abdias"],
  Jonah: ["jonah", "jonas"],
  Micah: ["micah", "michee"],
  Nahum: ["nahum"],
  Habakkuk: ["habakkuk", "habacuc"],
  Zephaniah: ["zephaniah", "sophonie"],
  Haggai: ["haggai", "aggee"],
  Zechariah: ["zechariah", "zacharie"],
  Malachi: ["malachi", "malachie"],
  Matthew: ["matthew", "matthieu"],
  Mark: ["mark", "marc"],
  Luke: ["luke", "luc"],
  John: ["john", "jean"],
  Acts: ["acts", "actes"],
  Romans: ["romans", "romains"],
  "1 Corinthians": ["1 corinthians", "1 corinthiens"],
  "2 Corinthians": ["2 corinthians", "2 corinthiens"],
  Galatians: ["galatians", "galates"],
  Ephesians: ["ephesians", "ephesiens"],
  Philippians: ["philippians", "philippiens"],
  Colossians: ["colossians", "colossiens"],
  "1 Thessalonians": ["1 thessalonians", "1 thessaloniciens"],
  "2 Thessalonians": ["2 thessalonians", "2 thessaloniciens"],
  "1 Timothy": ["1 timothy", "1 timothee"],
  "2 Timothy": ["2 timothy", "2 timothee"],
  Titus: ["titus", "tite"],
  Philemon: ["philemon"],
  Hebrews: ["hebrews", "hebreux"],
  James: ["james", "jacques"],
  "1 Peter": ["1 peter", "1 pierre"],
  "2 Peter": ["2 peter", "2 pierre"],
  "1 John": ["1 john", "1 jean"],
  "2 John": ["2 john", "2 jean"],
  "3 John": ["3 john", "3 jean"],
  Jude: ["jude"],
  Revelation: ["revelation", "apocalypse"],
};

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nowMs(): number {
  return Date.now();
}

function getRouteCacheValue(key: string): QueryRoutingDecision | undefined {
  const cached = routeCache.get(key);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= nowMs()) {
    routeCache.delete(key);
    return undefined;
  }

  return cached.value;
}

function setRouteCacheValue(key: string, value: QueryRoutingDecision): void {
  routeCache.set(key, {
    value,
    expiresAt: nowMs() + ROUTE_CACHE_TTL_MS,
  });
}

function toLsgBookName(input?: string): string | undefined {
  if (!input) return undefined;

  const normalizedInput = normalizeText(input);
  for (const [canonicalBook, aliases] of Object.entries(BOOK_ALIASES)) {
    const allCandidates = [canonicalBook, ...aliases];
    if (allCandidates.some((candidate) => normalizeText(candidate) === normalizedInput)) {
      return LSG_BOOK_NAMES[canonicalBook] ?? canonicalBook;
    }
  }

  return input;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeWeights(
  vectorWeight: number,
  graphWeight: number,
  bm25Weight: number
): { vectorWeight: number; graphWeight: number; bm25Weight: number } {
  const vw = Number.isFinite(vectorWeight) ? Math.max(0, vectorWeight) : 0;
  const gw = Number.isFinite(graphWeight) ? Math.max(0, graphWeight) : 0;
  const bw = Number.isFinite(bm25Weight) ? Math.max(0, bm25Weight) : 0;
  const total = vw + gw + bw;
  if (total <= 0) {
    return { vectorWeight: 0.6, graphWeight: 0.1, bm25Weight: 0.3 };
  }

  return {
    vectorWeight: Number((vw / total).toFixed(3)),
    graphWeight: Number((gw / total).toFixed(3)),
    bm25Weight: Number((bw / total).toFixed(3)),
  };
}

function detectTestament(book?: string): HybridFilters["testament"] | undefined {
  if (!book) return undefined;

  const normalizedBook = normalizeText(book);
  const isNewTestament = Array.from(NEW_TESTAMENT_KEYS).some((bookKey) => {
    const lsgName = LSG_BOOK_NAMES[bookKey] ?? bookKey;
    return normalizeText(bookKey) === normalizedBook || normalizeText(lsgName) === normalizedBook;
  });

  return isNewTestament ? "Nouveau Testament" : "Ancien Testament";
}

function extractBookFromQuery(query: string): string | undefined {
  const normalized = ` ${normalizeText(query)} `;

  for (const [book, aliases] of Object.entries(BOOK_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(` ${normalizeText(alias)} `)) {
        return toLsgBookName(book);
      }
    }
  }

  return undefined;
}

function heuristicIntent(query: string): QueryIntent {
  const q = normalizeText(query);
  if (/(son of|daughter of|father of|mother of|begat|descendant|lineage|genealogy|ancestor|brother of|sister of|fils de|fille de|pere de|mere de|engendra|descendance|genealogie|ancetre|frere de|soeur de)/.test(q)) {
    return "GENEALOGY";
  }
  if (/(where|located|location|egypt|israel|jerusalem|bethlehem|nazareth|canaan|region|city|mount|river|ou|situe|emplacement|lieu|ville|mont|fleuve|riviere)/.test(q)) {
    return "GEOGRAPHY";
  }
  if (/(when|timeline|before|after|during|century|year|reign|chronology|sequence|order of events|quand|chronologie|avant|apres|pendant|siecle|annee|regne|ordre des evenements)/.test(q)) {
    return "CHRONOLOGY";
  }
  if (/(what does the bible say|meaning|theme|theology|faith|hope|love|grace|sin|salvation|perseverance|forgiveness|wisdom|que dit la bible|signification|theme|theologie|foi|esperance|amour|grace|peche|salut|perseverance|pardon|sagesse|jesus|j[eé]sus|christ|messie|messiah|saint.?esprit|holy.?spirit)/.test(q)) {
    return "THEOLOGY";
  }
  return "GENERAL";
}

function isDirectKinshipQuestion(query: string): boolean {
  const q = normalizeText(query);
  return /(qui est .*fils de|qui est .*fille de|who is .*son of|who is .*daughter of|fils de|daughter of|son of)/i.test(q);
}

function isDirectEntityLookupQuestion(query: string): boolean {
  const q = normalizeText(query);
  return /^(qui est|who is|parle moi de|tell me about)\s+[a-z0-9][a-z0-9\s'’.-]*\??$/i.test(q);
}

function shouldUseHeuristicFastPath(query: string, fallback: QueryRoutingDecision): boolean {
  if (fallback.intent !== "GENERAL") {
    return true;
  }

  if (fallback.filters?.book || fallback.filters?.testament) {
    return true;
  }

  return isDirectEntityLookupQuestion(query);
}

function heuristicRoute(query: string): QueryRoutingDecision {
  const intent = heuristicIntent(query);
  const base =
    intent === "GENEALOGY" && isDirectKinshipQuestion(query)
      ? { vectorWeight: 0.68, graphWeight: 0.17, bm25Weight: 0.15, k: 6 }
      : INTENT_CONFIG[intent];
  const book = extractBookFromQuery(query);
  const filters = book ? { book, testament: detectTestament(book) } : undefined;

  return {
    intent,
    vectorWeight: base.vectorWeight,
    graphWeight: base.graphWeight,
    bm25Weight: base.bm25Weight,
    k: base.k,
    filters,
    reasoning: `Heuristic route selected intent ${intent} from query keywords.`,
    source: "heuristic",
    latencyMs: 0,
  };
}

async function llmRoute(query: string, timeoutMs: number): Promise<QueryRoutingDecision | null> {
  const startedAt = Date.now();

  try {
    const { result: parsed } = await executeWithFallback<Partial<RouterDecisionShape>>({
      clientOptions: {
        purpose: "router",
        model: ROUTER_MODEL,
        timeoutMs,
      },
      execute: (client) =>
        client.completeJson?.<Partial<RouterDecisionShape>>({
          model: ROUTER_MODEL,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You are a multilingual (English/French) query router for Bible retrieval. Return only JSON with this schema: { intent, vectorWeight, graphWeight, bm25Weight, k, filters: { testament?, book? }, reasoning }. intent must be one of THEOLOGY, GENEALOGY, GEOGRAPHY, CHRONOLOGY, GENERAL. Canonicalize book names to LSG French names (e.g., Genese -> Genèse, Matthew -> Matthieu). Prefer French testament labels (Ancien Testament / Nouveau Testament). Ensure vectorWeight + graphWeight + bm25Weight ~= 1. Keep reasoning under 160 chars.",
            },
            {
              role: "user",
              content: query,
            },
          ],
        }) ?? Promise.reject(new Error("Provider does not support JSON completion.")),
    });

    if (!parsed.intent || !(parsed.intent in INTENT_CONFIG)) {
      return null;
    }

    const normalized = normalizeWeights(
      parsed.vectorWeight ?? INTENT_CONFIG[parsed.intent].vectorWeight,
      parsed.graphWeight ?? INTENT_CONFIG[parsed.intent].graphWeight,
      parsed.bm25Weight ?? INTENT_CONFIG[parsed.intent].bm25Weight
    );

    const book = toLsgBookName(parsed.filters?.book ?? extractBookFromQuery(query));
    const filters: HybridFilters | undefined =
      parsed.filters || book
        ? {
            book,
            testament: parsed.filters?.testament ?? detectTestament(book),
          }
        : undefined;

    return {
      intent: parsed.intent,
      vectorWeight: normalized.vectorWeight,
      graphWeight: normalized.graphWeight,
      bm25Weight: normalized.bm25Weight,
      k: clampInt(parsed.k ?? INTENT_CONFIG[parsed.intent].k, 1, 20),
      filters,
      reasoning: parsed.reasoning?.trim() || `LLM classified query as ${parsed.intent}.`,
      source: "llm",
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return null;
  }
}

export async function routeQuery(input: QueryRouterInput): Promise<QueryRoutingDecision> {
  const startedAt = Date.now();
  const query = input.query.trim();
  const cacheKey = normalizeText(query);
  const timeoutMs = input.timeoutMs ?? ROUTER_TIMEOUT_MS;
  const fallback = heuristicRoute(query);
  let routed = getRouteCacheValue(cacheKey);
  let llmLatencyMs = 0;
  let usedLlmResult = false;
  let heuristicFastPath = false;
  let cacheStatus: "hit" | "shared" | "miss" = "miss";

  if (!routed) {
    const inFlight = routeInFlight.get(cacheKey);
    if (inFlight) {
      cacheStatus = "shared";
      routed = await inFlight;
    } else {
      const routePromise = (async () => {
        const useHeuristicFastPath = shouldUseHeuristicFastPath(query, fallback);
        const llmStartedAt = useHeuristicFastPath ? 0 : Date.now();
        const llmResult = useHeuristicFastPath ? null : await llmRoute(query, timeoutMs);
        const nextRouted = llmResult ?? fallback;

        llmLatencyMs = useHeuristicFastPath ? 0 : Date.now() - llmStartedAt;
        usedLlmResult = Boolean(llmResult);
        heuristicFastPath = useHeuristicFastPath;

        setRouteCacheValue(cacheKey, nextRouted);
        return nextRouted;
      })();

      routeInFlight.set(cacheKey, routePromise);
      try {
        routed = await routePromise;
      } finally {
        routeInFlight.delete(cacheKey);
      }
    }
  } else {
    cacheStatus = "hit";
  }

  if (!routed) {
    routed = fallback;
  }

  if (cacheStatus !== "miss") {
    heuristicFastPath = routed.source === "heuristic" && shouldUseHeuristicFastPath(query, fallback);
  }

  const mergedK = input.requested?.k ?? routed.k;
  const mergedFilters = {
    ...routed.filters,
    ...input.requested?.filters,
  };

  const mergedWeights = normalizeWeights(
    input.requested?.vectorWeight ?? routed.vectorWeight,
    input.requested?.graphWeight ?? routed.graphWeight,
    input.requested?.bm25Weight ?? routed.bm25Weight
  );

  const applyKinshipFastProfile = routed.intent === "GENEALOGY" && isDirectKinshipQuestion(query);
  const finalWeights =
    applyKinshipFastProfile &&
    input.requested?.vectorWeight == null &&
    input.requested?.graphWeight == null &&
    input.requested?.bm25Weight == null
      ? { vectorWeight: 0.68, graphWeight: 0.17, bm25Weight: 0.15 }
      : mergedWeights;

  const decision = {
    ...routed,
    ...finalWeights,
    k: clampInt(mergedK, 1, 20),
    filters: Object.keys(mergedFilters).length ? mergedFilters : undefined,
    reasoning:
      input.requested?.vectorWeight != null ||
      input.requested?.graphWeight != null ||
      input.requested?.bm25Weight != null ||
      input.requested?.k != null ||
      input.requested?.filters != null
        ? `${routed.reasoning} Request overrides were applied.`
        : routed.reasoning,
  };

  logPerf("decision", {
    query,
    source: decision.source,
    intent: decision.intent,
    totalLatencyMs: Date.now() - startedAt,
    llmLatencyMs,
    heuristicFastPath,
    usedLlmResult,
    cacheStatus,
  });

  return decision;
}
