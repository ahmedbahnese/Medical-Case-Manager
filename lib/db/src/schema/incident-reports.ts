import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const incidentReportsTable = sqliteTable("incident_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  incidentType: text("incident_type").notNull(),
  incidentLocation: text("incident_location").notNull(),
  reportDate: integer("report_date", { mode: "timestamp_ms" }).notNull(),
  reportDay: text("report_day"),
  reportTime: text("report_time"),
  totalInjured: integer("total_injured").notNull().default(0),
  totalDeaths: integer("total_deaths").notNull().default(0),
  hospitalsTransferredTo: text("hospitals_transferred_to"),
  casesJson: text("cases_json").notNull().default("[]"),
  reporterName: text("reporter_name"),
  reporterRole: text("reporter_role"),
  status: text("status").notNull().default("new"),
  severity: text("severity").notNull().default("no_harm"),
  eventDescription: text("event_description"),
  immediateAction: text("immediate_action"),
  investigationSummary: text("investigation_summary"),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  preventiveAction: text("preventive_action"),
  actionOwner: text("action_owner"),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  verificationNotes: text("verification_notes"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type IncidentReport = typeof incidentReportsTable.$inferSelect;
