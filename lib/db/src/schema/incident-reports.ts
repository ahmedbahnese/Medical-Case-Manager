import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const incidentReportsTable = pgTable("incident_reports", {
  id: serial("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  incidentLocation: text("incident_location").notNull(),
  reportDate: timestamp("report_date").notNull(),
  reportDay: text("report_day"),
  reportTime: text("report_time"),
  totalInjured: integer("total_injured").notNull().default(0),
  totalDeaths: integer("total_deaths").notNull().default(0),
  hospitalsTransferredTo: text("hospitals_transferred_to"),
  casesJson: text("cases_json").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IncidentReport = typeof incidentReportsTable.$inferSelect;
