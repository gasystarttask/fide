#!/bin/sh
set -eu

MEILI_URL="${MEILISEARCH_URL:-http://meilisearch:7700}"
MEILI_KEY="${MEILISEARCH_API_KEY:-masterKey}"

wait_for_meili() {
  i=0
  until curl -fsS "$MEILI_URL/health" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
      echo "Meilisearch health check timed out"
      exit 1
    fi
    sleep 2
  done
}

create_index() {
  uid="$1"
  primary="$2"

  curl -fsS -X POST "$MEILI_URL/indexes" \
    -H "Authorization: Bearer $MEILI_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"uid\":\"$uid\",\"primaryKey\":\"$primary\"}" \
    >/dev/null 2>&1 || true
}

update_settings() {
  uid="$1"
  filterable="$2"
  searchable="$3"

  curl -fsS -X PATCH "$MEILI_URL/indexes/$uid/settings" \
    -H "Authorization: Bearer $MEILI_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"searchableAttributes\":$searchable,\"filterableAttributes\":$filterable,\"rankingRules\":[\"words\",\"typo\",\"proximity\",\"attribute\",\"sort\",\"exactness\"]}" \
    >/dev/null
}

wait_for_meili

create_index "verses_bm25" "id"
update_settings "verses_bm25" '["book","testament","version","chapter"]' '["text","book","chapter"]'

create_index "entities_bm25" "slug"
update_settings "entities_bm25" '["type","source_verse_id"]' '["name","aliases","type","description"]'

echo "Meilisearch indexes initialized"
