import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
