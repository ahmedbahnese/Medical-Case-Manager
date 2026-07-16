import { pgTable, serial, text, boolean, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const waitingCareTypeEnum = pgEnum("waiting_care_type", [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator",
]);

export const waitingRespirationEnum = pgEnum("waiting_respiration", [
  "high_frequency",
  "vent",
  "cpap",
  "standby",
  "no",
]);

export const waitingSectionEnum = pgEnum("waiting_section", ["servo", "reception"]);

export const waitingStatusEnum = pgEnum("waiting_status", ["waiting", "admitted", "cancelled"]);

export const waitingCasesTable = pgTable("waiting_cases", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  age: text("age"),
  diagnosis: text("diagnosis"),
  parentPhone: text("parent_phone"),
  nationalId: text("national_id"),
  careType: waitingCareTypeEnum("care_type").notNull(),
  centralRoomRequired: boolean("central_room_required").notNull().default(false),
  centralRoomCode: text("central_room_code"),
  artificialRespiration: waitingRespirationEnum("artificial_respiration").notNull().default("no"),
  section: waitingSectionEnum("section").notNull().default("reception"),
  status: waitingStatusEnum("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWaitingCaseSchema = createInsertSchema(waitingCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWaitingCase = z.infer<typeof insertWaitingCaseSchema>;
export type WaitingCase = typeof waitingCasesTable.$inferSelect;
