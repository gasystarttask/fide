import type { EntityFact, UIText } from "../types/ui";

function relationToSnippet(
  sourceName: string,
  relationType: string,
  targetName: string,
  uiText: UIText
): string {
  const templates = uiText.relationTemplates;

  switch (relationType) {
    case "FATHER_OF":
      return templates.FATHER_OF(sourceName, targetName);
    case "MOTHER_OF":
      return templates.MOTHER_OF(sourceName, targetName);
    case "SON_OF":
      return templates.SON_OF(sourceName, targetName);
    case "DAUGHTER_OF":
      return templates.DAUGHTER_OF(sourceName, targetName);
    case "SPOUSE_OF":
      return templates.SPOUSE_OF(sourceName, targetName);
    case "BROTHER_OF":
      return templates.BROTHER_OF(sourceName, targetName);
    case "SISTER_OF":
      return templates.SISTER_OF(sourceName, targetName);
    case "TRAVELS_TO":
      return templates.TRAVELS_TO(sourceName, targetName);
    case "LOCATED_IN":
      return templates.LOCATED_IN(sourceName, targetName);
    case "FOLLOWER_OF":
      return templates.FOLLOWER_OF(sourceName, targetName);
    case "INTERACTS_WITH":
      return templates.INTERACTS_WITH(sourceName, targetName);
    case "EVENT_AT":
      return templates.EVENT_AT(sourceName, targetName);
    default:
      return templates.fallback(sourceName, targetName, relationType.toLowerCase().split("_").join(" "));
  }
}

export function buildRelationSnippets(entityFacts: EntityFact[], uiText: UIText, maxSnippets = 8): string[] {
  const snippets: string[] = [];
  const seen = new Set<string>();

  for (const entity of entityFacts) {
    for (const relation of entity.relations ?? []) {
      const sourceName = entity.name?.trim();
      const targetName = relation.targetName?.trim();
      const relationType = relation.type?.trim();

      if (!sourceName || !targetName || !relationType) {
        continue;
      }

      const snippet = relationToSnippet(sourceName, relationType, targetName, uiText);
      const dedupeKey = snippet.toLowerCase();

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      snippets.push(snippet);

      if (snippets.length >= maxSnippets) {
        return snippets;
      }
    }
  }

  return snippets;
}
