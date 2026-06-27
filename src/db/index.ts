import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }

    const globalForDb = globalThis as typeof globalThis & {
      __aryaCampaignPool?: Pool;
    };

    _pool =
      globalForDb.__aryaCampaignPool ??
      new Pool({
        connectionString: databaseUrl,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__aryaCampaignPool = _pool;
    }
  }

  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool());
  }
  return _db;
}

// Proxy ensures lazy initialization - db/pool only created on first property access
export const db = new Proxy(
  {} as ReturnType<typeof getDb>,
  { get: (_target, prop) => (getDb() as any)[prop] }
);

export const pool = new Proxy(
  {} as Pool,
  { get: (_target, prop) => (getPool() as any)[prop] }
);
