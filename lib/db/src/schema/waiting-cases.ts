import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const waitingCareTypeValues = [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator",
  "internal",
] as const;

export const waitingRespirationValues = [
  "high_frequency",
  "vent",
  "cpap",
  "hfnc",
  "standby",
  "box",
  "no",
] as const;

export const waitingSectionValues = ["servo", "reception"] as const;
export const waitingStatusValues = ["waiting", "admitted", "cancelled"] as const;

export const waitingCasesTable = sqliteTable("waiting_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientName: text("patient_name").notNull(),
  age: text("age"),
  diagnosis: text("diagnosis"),
  parentPhone: text("parent_phone"),
  nationalId: text("national_id"),
  medicalReport: text("medical_report"),
  medicalReportName: text("medical_report_name"),
  medicalReportData: text("medical_report_data"),
  careType: text("care_type").notNull(),
  centralRoomRequired: integer("central_room_required", { mode: "boolean" }).notNull().default(false),
  centralRoomCode: text("central_room_code"),
  artificialRespiration: text("artificial_respiration").notNull().default("no"),
  section: text("section").notNull().default("reception"),
  status: text("status").notNull().default("waiting"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const insertWaitingCaseSchema = createInsertSchema(waitingCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWaitingCase = z.infer<typeof insertWaitingCaseSchema>;
export type WaitingCase = typeof waitingCasesTable.$inferSelect;
