import { pgTable, serial, text, integer, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const caseTypeEnum = pgEnum("case_type", [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator",
]);

export const artificialRespirationEnum = pgEnum("artificial_respiration", [
  "high_frequency",
  "vent",
  "cpap",
  "standby",
  "no",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "active",
  "recovering",
  "discharged",
  "critical",
]);

export const medicalCasesTable = pgTable("medical_cases", {
  id: serial("id").primaryKey(),
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
  caseType: caseTypeEnum("case_type").notNull().default("intensive_care_high"),
  artificialRespiration: artificialRespirationEnum("artificial_respiration").notNull().default("no"),
  status: caseStatusEnum("status").notNull().default("active"),
  admissionDate: timestamp("admission_date").defaultNow().notNull(),
  dischargeDate: timestamp("discharge_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMedicalCaseSchema = createInsertSchema(medicalCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedicalCase = z.infer<typeof insertMedicalCaseSchema>;
export type MedicalCase = typeof medicalCasesTable.$inferSelect;
