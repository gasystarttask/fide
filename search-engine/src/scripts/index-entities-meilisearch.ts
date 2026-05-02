import { readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";
import { ensureMeilisearchIndexes, getMeilisearchClient, isMeilisearchDisabled } from "@search/lib/meilisearch-client";

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_GRAPH_PATH = "../data/raw_graph.enrich.json";

type GraphEntity = {
  slug: string;
  name: string;
  type: string;
  aliases?: string[];
  description?: string;
  source_verse_id?: string;
};

type GraphChapter = {
  entities?: GraphEntity[];
};

type GraphFile = {
  chapters?: GraphChapter[];
  merged_entities?: GraphEntity[];
};

type EntityDocument = {
  slug: string;
  name: string;
  type: string;
  aliases: string[];
  description: string;
  source_verse_id: string;
};

function assertMeiliTaskSucceeded(
  task: { status: string; error?: { message?: string } | null },
  context: string
): void {
  if (task.status === "failed") {
    const message = task.error?.message ?? "unknown task error";
    throw new Error(`[meilisearch][entities] ${context} failed: ${message}`);
  }
}

function normalizeAlias(value: string): string {
  return value.trim();
}

function uniqAliases(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const alias of input.map(normalizeAlias).filter(Boolean)) {
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

function resolveInputPath(): string {
  return path.resolve(process.cwd(), process.env.MEILI_ENTITIES_INPUT_PATH ?? DEFAULT_GRAPH_PATH);
}

async function readGraphEntities(inputPath: string): Promise<GraphEntity[]> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as GraphFile;

  const merged = Array.isArray(parsed.merged_entities) ? parsed.merged_entities : [];
  const chapterEntities = (parsed.chapters ?? []).flatMap((chapter) => chapter.entities ?? []);

  return [...merged, ...chapterEntities].filter((entity) => typeof entity.slug === "string");
}

async function readMongoEntities(): Promise<GraphEntity[]> {
  const mongoUri = process.env.DATABASE_URL;
  if (!mongoUri) return [];

  const dbName = process.env.MONGODB_DB_NAME ?? "bible_sg";
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const docs = await client
      .db(dbName)
      .collection<GraphEntity>("entities")
      .find({}, { projection: { slug: 1, name: 1, type: 1, aliases: 1, description: 1, source_verse_id: 1 } })
      .toArray();

    return docs;
  } catch (error) {
    console.warn("[meilisearch][entities] mongodb read skipped", error);
    return [];
  } finally {
    await client.close();
  }
}

function mergeEntities(input: GraphEntity[]): EntityDocument[] {
  const merged = new Map<string, EntityDocument>();

  for (const entity of input) {
    const slug = entity.slug?.trim();
    const name = entity.name?.trim();
    if (!slug || !name) continue;

    const existing = merged.get(slug);
    const aliases = uniqAliases([
      ...(existing?.aliases ?? []),
      ...(entity.aliases ?? []),
      slug,
      name,
    ]);

    merged.set(slug, {
      slug,
      name,
      type: entity.type?.trim() || existing?.type || "Unknown",
      aliases,
      description: entity.description?.trim() || existing?.description || "",
      source_verse_id: entity.source_verse_id?.trim() || existing?.source_verse_id || "",
    });
  }

  return Array.from(merged.values());
}

export async function indexEntitiesMeilisearch(batchSize = DEFAULT_BATCH_SIZE): Promise<number> {
  if (isMeilisearchDisabled()) {
    console.warn("[meilisearch][entities] skipped because SKIP_MEILISEARCH=true");
    return 0;
  }

  const inputPath = resolveInputPath();
  const [graphEntities, mongoEntities] = await Promise.all([
    readGraphEntities(inputPath),
    readMongoEntities(),
  ]);

  const docs = mergeEntities([...graphEntities, ...mongoEntities]);

  const client = getMeilisearchClient();
  await ensureMeilisearchIndexes(client);

  const index = client.index("entities_bm25");
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const task = await index.addDocuments(batch, { primaryKey: "slug" });
    const finishedTask = await client.tasks.waitForTask(task.taskUid);
    assertMeiliTaskSucceeded(finishedTask, `batch ${Math.floor(i / batchSize) + 1}`);
  }

  console.info(`[meilisearch][entities] indexed ${docs.length} entities from graph+mongodb`);
  return docs.length;
}

async function run(): Promise<void> {
  const indexed = await indexEntitiesMeilisearch();
  console.info(`[meilisearch][entities] done. total=${indexed}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error("[meilisearch][entities] failed", error);
    process.exitCode = 1;
  });
}
