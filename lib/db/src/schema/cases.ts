import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enum value arrays (exported for runtime validation) ───────────────────
export const caseTypeValues = [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator",
  "internal",
] as const;

export const artificialRespirationValues = [
  "high_frequency",
  "vent",
  "cpap",
  "hfnc",
  "standby",
  "box",
  "no",
] as const;

export const caseStatusValues = [
  "active",
  "recovering",
  "discharged",
  "critical",
] as const;

export const dischargeReasonValues = [
  "improved",
  "request",
  "transferred",
  "death",
  "internal_transfer",
] as const;

export const medicalCasesTable = sqliteTable("medical_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientName: text("patient_name").notNull(),
  departmentId: integer("department_id").notNull(),
  age: text("age"),
  diagnosis: text("diagnosis"),
  symptoms: text("symptoms"),
  treatment: text("treatment"),
  notes: text("notes"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  nationalId: text("national_id"),
  fileNumber: text("file_number"),
  caseType: text("case_type").notNull().default("intensive_care_high"),
  artificialRespiration: text("artificial_respiration").notNull().default("no"),
  status: text("status").notNull().default("active"),
  mobe: text("mobe"),
  ventilationStartDate: integer("ventilation_start_date", { mode: "timestamp_ms" }),
  ventilationEndDate: integer("ventilation_end_date", { mode: "timestamp_ms" }),
  dischargeReason: text("discharge_reason"),
  transferDestination: text("transfer_destination"),
  admissionDate: integer("admission_date", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  dischargeDate: integer("discharge_date", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const insertMedicalCaseSchema = createInsertSchema(medicalCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedicalCase = z.infer<typeof insertMedicalCaseSchema>;
export type MedicalCase = typeof medicalCasesTable.$inferSelect;
