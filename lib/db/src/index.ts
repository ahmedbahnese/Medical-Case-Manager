import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

// Support both a full DATABASE_URL and individual host/port/user/password/name vars.
// DATABASE_URL takes precedence when set.
const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : new Pool({
      host:     process.env.DB_HOST     ?? "127.0.0.1",
      port:     Number(process.env.DB_PORT ?? 5432),
      user:     process.env.DB_USER     ?? "bsch_user",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME     ?? "bsch_db",
      max:      10,
    });

export const db = drizzle(pool, { schema });
export * from "./schema";
