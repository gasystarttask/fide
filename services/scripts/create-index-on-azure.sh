cd iac
HOST=$(terraform output -raw mongo_connection_string | sed -E 's#mongodb\+srv://[^@]*@([^/?]+).*#\1#')
USER=$(terraform output -raw administrator_username)
PASS=$(terraform output -raw administrator_password)
cd ..

npx mongosh "mongodb+srv://${HOST}/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false" \
  --username="$USER" \
  --password="$PASS" \
  --eval '
db = db.getSiblingDB("bible_sg");
db.runCommand({
  createIndexes: "verses",
  indexes: [{
    key: { embedding: "cosmosSearch" },
    name: "vector_idx",
    cosmosSearchOptions: {
      kind: "vector-hnsw",
      similarity: "COS",
      dimensions: 1536
    }
  }]
});
'

cd iac
HOST=$(terraform output -raw mongo_connection_string | sed -E 's#mongodb\+srv://[^@]*@([^/?]+).*#\1#')
USER=$(terraform output -raw administrator_username)
PASS=$(terraform output -raw administrator_password)
cd ..

npx mongosh "mongodb+srv://${HOST}/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false" \
  --username="$USER" \
  --password="$PASS" \
  --eval '
db = db.getSiblingDB("bible_sg");
db.verses.createIndex({ entity_slugs: 1 });
db.verses.createIndex({ reference: 1 }, { name: "ix_verses_reference" });
db.verses.createIndex({ id: 1 }, { name: "ix_verses_id" });
db.verses.createIndex({ book: 1, chapter: 1, verse: 1 }, { name: "ix_verses_book_chapter_verse" });
db.entities.createIndex({ slug: 1 }, { unique: true });
db.entities.createIndex({ name: 1 }, { name: "ix_entities_name" });
db.entities.createIndex({ aliases: 1 }, { name: "ix_entities_aliases" });
db.relations.createIndex({ source_slug: 1 });
db.relations.createIndex({ source_entity_id: 1 });
'