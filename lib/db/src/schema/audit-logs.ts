import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  details: text("details"),
  performedBy: text("performed_by").default("المستخدم"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
