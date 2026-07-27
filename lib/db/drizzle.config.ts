import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? `postgresql://${process.env.DB_USER ?? "bsch_user"}:${process.env.DB_PASSWORD ?? ""}@${process.env.DB_HOST ?? "127.0.0.1"}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME ?? "bsch_db"}`,
  },
});
