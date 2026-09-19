import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const notificationsTable = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  message: text("message").notNull(),
  fromUser: text("from_user").notNull(),
  delivery: text("delivery").notNull().default("announcement"),
  audience: text("audience").notNull().default("selected"),
  recipientsJson: text("recipients_json").notNull().default("[]"),
  readByJson: text("read_by_json").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type Notification = typeof notificationsTable.$inferSelect;
