import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import pg from "pg";

// Single persistence seam for everything that must survive restarts
// (positions, price history). With DATABASE_URL set (hosted + Neon) values
// live in a Postgres kv table; without it (local dev) they live in
// data-cache/*.json files. Callers never know the difference.

const CACHE_DIR = path.resolve("data-cache");

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

function filePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

export function initKvStore(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("kv store: no DATABASE_URL, using local files");
    return Promise.resolve();
  }
  pool = new pg.Pool({ connectionString: url, max: 3 });
  ready = pool
    .query("CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value JSONB NOT NULL)")
    .then(() => console.log("kv store: postgres connected"))
    .catch((err) => {
      console.error("kv store: postgres init failed, falling back to files", err);
      pool = null;
    });
  return ready;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (pool) {
    if (ready) await ready;
    try {
      const res = await pool.query("SELECT value FROM kv_store WHERE key = $1", [key]);
      return res.rows[0]?.value ?? null;
    } catch (err) {
      console.error(`kv get failed for ${key}`, err);
      return null;
    }
  }
  if (!existsSync(filePath(key))) return null;
  try {
    return JSON.parse(readFileSync(filePath(key), "utf-8"));
  } catch (err) {
    console.error(`kv file unreadable for ${key}`, err);
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (pool) {
    if (ready) await ready;
    try {
      await pool.query(
        "INSERT INTO kv_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        [key, JSON.stringify(value)]
      );
      return;
    } catch (err) {
      console.error(`kv set failed for ${key}`, err);
      return;
    }
  }
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(filePath(key), JSON.stringify(value));
  } catch (err) {
    console.error(`kv file write failed for ${key}`, err);
  }
}
