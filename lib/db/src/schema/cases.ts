import { mysqlTable, int, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enum value arrays (exported for runtime validation) ───────────────────
export const caseTypeValues = [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator",
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
] as const;

export const medicalCasesTable = mysqlTable("medical_cases", {
  id: int("id").autoincrement().primaryKey(),
  patientName: text("patient_name").notNull(),
  departmentId: int("department_id").notNull(),
  age: text("age"),
  diagnosis: text("diagnosis"),
  symptoms: text("symptoms"),
  treatment: text("treatment"),
  notes: text("notes"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  nationalId: text("national_id"),
  fileNumber: text("file_number"),
  caseType: mysqlEnum("case_type", caseTypeValues).notNull().default("intensive_care_high"),
  artificialRespiration: mysqlEnum("artificial_respiration", artificialRespirationValues).notNull().default("no"),
  status: mysqlEnum("status", caseStatusValues).notNull().default("active"),
  mobe: text("mobe"),
  ventilationStartDate: timestamp("ventilation_start_date"),
  ventilationEndDate: timestamp("ventilation_end_date"),
  dischargeReason: mysqlEnum("discharge_reason", dischargeReasonValues),
  admissionDate: timestamp("admission_date").defaultNow().notNull(),
  dischargeDate: timestamp("discharge_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMedicalCaseSchema = createInsertSchema(medicalCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedicalCase = z.infer<typeof insertMedicalCaseSchema>;
export type MedicalCase = typeof medicalCasesTable.$inferSelect;
