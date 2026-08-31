import { createRequire } from "node:module";
import { drizzle } from "drizzle-orm/better-sqlite3";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.BSCH_DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const databasePath = process.env.BSCH_DATABASE_PATH ?? path.join(dataDir, "bsch.sqlite");
const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { databasePath };
export * from "./schema";
