import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "../../migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.BSCH_DATABASE_PATH ?? "../../data/bsch.sqlite",
  },
});
