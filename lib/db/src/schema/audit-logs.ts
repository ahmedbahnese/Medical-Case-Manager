import { mysqlTable, int, text, timestamp } from "drizzle-orm/mysql-core";

export const auditLogsTable = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: int("entity_id"),
  entityName: text("entity_name"),
  details: text("details"),
  performedBy: text("performed_by").default("المستخدم"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
