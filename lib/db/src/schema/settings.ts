import { mysqlTable, int, text, timestamp } from "drizzle-orm/mysql-core";

export const settingsTable = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: text("key").notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
