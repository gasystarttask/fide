import { Meilisearch, type Index } from "meilisearch";

const DEFAULT_MEILI_URL = "http://localhost:7700";
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

let singletonClient: Meilisearch | null = null;

function getEnvBoolean(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function getMeiliConfig() {
  return {
    host: process.env.MEILISEARCH_URL ?? DEFAULT_MEILI_URL,
    apiKey: process.env.MEILISEARCH_API_KEY,
  };
}

export function getMeilisearchClient(): Meilisearch {
  if (singletonClient) return singletonClient;

  singletonClient = new Meilisearch(getMeiliConfig());
  return singletonClient;
}

export function isMeilisearchDisabled(): boolean {
  return getEnvBoolean("SKIP_MEILISEARCH", false);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withMeilisearchRetry<T>(
  operation: () => Promise<T>,
  retries = DEFAULT_RETRY_COUNT,
  delayMs = DEFAULT_RETRY_DELAY_MS
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError;
}

export async function checkMeilisearchHealth(client = getMeilisearchClient()): Promise<boolean> {
  if (isMeilisearchDisabled()) return false;

  try {
    const health = await withMeilisearchRetry<{ status?: string }>(() => client.health());
    return health.status === "available";
  } catch {
    return false;
  }
}

const RANKING_RULES = ["words", "typo", "proximity", "attribute", "sort", "exactness"];

async function ensureIndex(
  client: Meilisearch,
  uid: string,
  primaryKey: string,
  searchableAttributes: string[],
  filterableAttributes: string[]
): Promise<Index> {
  const exists = await client.index(uid).fetchInfo().then(
    () => true,
    () => false
  );

  if (!exists) {
    await withMeilisearchRetry(() => client.createIndex(uid, { primaryKey }));
  }

  const index = client.index(uid);
  await withMeilisearchRetry(() =>
    index.updateSettings({
      searchableAttributes,
      filterableAttributes,
      rankingRules: RANKING_RULES,
    })
  );

  return index;
}

export async function ensureMeilisearchIndexes(client = getMeilisearchClient()): Promise<void> {
  if (isMeilisearchDisabled()) return;

  await ensureIndex(
    client,
    "verses_bm25",
    "id",
    ["text", "book", "chapter"],
    ["book", "testament", "version", "chapter"]
  );

  await ensureIndex(
    client,
    "entities_bm25",
    "slug",
    ["name", "aliases", "type", "description"],
    ["type", "source_verse_id"]
  );
}
