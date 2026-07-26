import { mysqlTable, int, text, timestamp } from "drizzle-orm/mysql-core";

export const incidentReportsTable = mysqlTable("incident_reports", {
  id: int("id").autoincrement().primaryKey(),
  incidentType: text("incident_type").notNull(),
  incidentLocation: text("incident_location").notNull(),
  reportDate: timestamp("report_date").notNull(),
  reportDay: text("report_day"),
  reportTime: text("report_time"),
  totalInjured: int("total_injured").notNull().default(0),
  totalDeaths: int("total_deaths").notNull().default(0),
  hospitalsTransferredTo: text("hospitals_transferred_to"),
  casesJson: text("cases_json").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IncidentReport = typeof incidentReportsTable.$inferSelect;
