import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const host     = process.env.DB_HOST     ?? "127.0.0.1";
const port     = Number(process.env.DB_PORT ?? 3306);
const user     = process.env.DB_USER     ?? "bsch_user";
const password = process.env.DB_PASSWORD ?? "";
const database = process.env.DB_NAME     ?? "bsch_db";

if (!user || !database) {
  throw new Error(
    "DB_USER and DB_NAME must be set. Check your environment variables.",
  );
}

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

export const db = drizzle(pool, { schema, mode: "default" });
export * from "./schema";
