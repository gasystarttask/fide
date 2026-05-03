import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.DATABASE_URL;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "bible_sg";
const MONGODB_CONNECT_TIMEOUT_MS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS ?? "5000");

if (!MONGODB_URI) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

declare global {
   
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const timeoutMs = Number.isFinite(MONGODB_CONNECT_TIMEOUT_MS) && MONGODB_CONNECT_TIMEOUT_MS > 0
  ? MONGODB_CONNECT_TIMEOUT_MS
  : 5000;

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: timeoutMs,
  connectTimeoutMS: timeoutMs,
});
const clientPromise =
  global.__mongoClientPromise ?? (global.__mongoClientPromise = client.connect());

export async function getDb(): Promise<Db> {
  const connectedClient = await Promise.race([
    clientPromise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`MongoDB connection timeout after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
  return connectedClient.db(DB_NAME);
}