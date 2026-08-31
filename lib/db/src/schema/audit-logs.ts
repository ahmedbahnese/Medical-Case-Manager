import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const auditLogsTable = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  details: text("details"),
  performedBy: text("performed_by").default("المستخدم"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
