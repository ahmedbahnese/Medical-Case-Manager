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
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type IncidentReport = typeof incidentReportsTable.$inferSelect;
