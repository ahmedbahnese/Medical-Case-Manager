import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const backupsTable = sqliteTable("backups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  backupName: text("backup_name").notNull(),
  backupData: text("backup_data").notNull(),
  recordCount: integer("record_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const insertBackupSchema = createInsertSchema(backupsTable).omit({ id: true, createdAt: true });
export type InsertBackup = z.infer<typeof insertBackupSchema>;
export type Backup = typeof backupsTable.$inferSelect;
