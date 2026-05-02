import { ensureMeilisearchIndexes, getMeilisearchClient, isMeilisearchDisabled } from "@search/lib/meilisearch-client";
import { indexVersesMeilisearch } from "@search/scripts/index-verses-meilisearch";
import { indexEntitiesMeilisearch } from "@search/scripts/index-entities-meilisearch";

export async function reindexAllMeilisearch(): Promise<{ verses: number; entities: number }> {
  if (isMeilisearchDisabled()) {
    console.warn("[meilisearch][reindex] skipped because SKIP_MEILISEARCH=true");
    return { verses: 0, entities: 0 };
  }

  const client = getMeilisearchClient();
  await ensureMeilisearchIndexes(client);

  const clearVersesTask = await client.index("verses_bm25").deleteAllDocuments();
  const clearEntitiesTask = await client.index("entities_bm25").deleteAllDocuments();

  await client.tasks.waitForTask(clearVersesTask.taskUid);
  await client.tasks.waitForTask(clearEntitiesTask.taskUid);

  const verses = await indexVersesMeilisearch();
  const entities = await indexEntitiesMeilisearch();

  return { verses, entities };
}

async function run(): Promise<void> {
  const result = await reindexAllMeilisearch();
  console.info(`[meilisearch][reindex] done. verses=${result.verses} entities=${result.entities}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error("[meilisearch][reindex] failed", error);
    process.exitCode = 1;
  });
}
