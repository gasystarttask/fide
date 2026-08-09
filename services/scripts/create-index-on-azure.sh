cd iac
HOST=$(terraform output -raw mongo_connection_string | sed -E 's#mongodb\+srv://[^@]*@([^/?]+).*#\1#')
USER=$(terraform output -raw administrator_username)
PASS=$(terraform output -raw administrator_password)
cd ..

npx mongosh "mongodb+srv://${HOST}/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false" \
  --username "$USER" \
  --password "$PASS" \
  --eval '
db = db.getSiblingDB("bible_sg");
db.runCommand({
  createIndexes: "verses",
  indexes: [{
    key: { embedding: "cosmosSearch" },
    name: "vector_idx",
    cosmosSearchOptions: {
      kind: "vector-ivf",
      numLists: 1,
      similarity: "COS",
      dimensions: 1536
    }
  }]
});
'