import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const backupsTable = pgTable("backups", {
  id: serial("id").primaryKey(),
  backupName: text("backup_name").notNull(),
  backupData: text("backup_data").notNull(),
  recordCount: integer("record_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBackupSchema = createInsertSchema(backupsTable).omit({ id: true, createdAt: true });
export type InsertBackup = z.infer<typeof insertBackupSchema>;
export type Backup = typeof backupsTable.$inferSelect;
