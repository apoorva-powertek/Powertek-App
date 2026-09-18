import { env } from "cloudflare:workers";

export function rawDb(): D1Database {
  if (!env.DB) throw new Error("Pole portal database is unavailable");
  return env.DB;
}

export function objectBucket(): R2Bucket {
  if (!env.BUCKET) throw new Error("Pole portal file storage is unavailable");
  return env.BUCKET;
}
