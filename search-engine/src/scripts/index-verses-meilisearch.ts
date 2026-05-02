import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureMeilisearchIndexes, getMeilisearchClient, isMeilisearchDisabled } from "@search/lib/meilisearch-client";

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_VERSES_PATH = "../data/processed_bible.json";

type VerseSource = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  metadata?: {
    testament?: string;
    version?: string;
  };
};

type VerseBM25Document = {
  id: string;
  verse_id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  testament: string;
  version: string;
};

function toMeiliId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function assertMeiliTaskSucceeded(
  task: { status: string; error?: { message?: string } | null },
  context: string
): void {
  if (task.status === "failed") {
    const message = task.error?.message ?? "unknown task error";
    throw new Error(`[meilisearch][verses] ${context} failed: ${message}`);
  }
}

function resolveInputPath(): string {
  return path.resolve(process.cwd(), process.env.MEILI_VERSES_INPUT_PATH ?? DEFAULT_VERSES_PATH);
}

async function readVerses(inputPath: string): Promise<VerseSource[]> {
  const raw = await readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as VerseSource[];
  return parsed.filter((verse) => typeof verse.id === "string" && typeof verse.text === "string");
}

function mapVerse(doc: VerseSource): VerseBM25Document {
  return {
    id: toMeiliId(doc.id),
    verse_id: doc.id,
    book: doc.book,
    chapter: doc.chapter,
    verse: doc.verse,
    text: doc.text,
    testament: doc.metadata?.testament ?? "Unknown",
    version: doc.metadata?.version ?? "Unknown",
  };
}

export async function indexVersesMeilisearch(batchSize = DEFAULT_BATCH_SIZE): Promise<number> {
  if (isMeilisearchDisabled()) {
    console.warn("[meilisearch][verses] skipped because SKIP_MEILISEARCH=true");
    return 0;
  }

  const inputPath = resolveInputPath();
  const verses = await readVerses(inputPath);
  const documents = verses.map(mapVerse);

  const client = getMeilisearchClient();
  await ensureMeilisearchIndexes(client);
  const index = client.index("verses_bm25");

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const task = await index.addDocuments(batch, { primaryKey: "id" });
    const finishedTask = await client.tasks.waitForTask(task.taskUid);
    assertMeiliTaskSucceeded(finishedTask, `batch ${Math.floor(i / batchSize) + 1}`);
  }

  console.info(`[meilisearch][verses] indexed ${documents.length} verses from ${inputPath}`);
  return documents.length;
}

async function run(): Promise<void> {
  const indexed = await indexVersesMeilisearch();
  console.info(`[meilisearch][verses] done. total=${indexed}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error("[meilisearch][verses] failed", error);
    process.exitCode = 1;
  });
}
