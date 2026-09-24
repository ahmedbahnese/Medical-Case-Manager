import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outpatientAppointmentSourceValues = ["system", "external", "staff"] as const;
export const outpatientAppointmentStatusValues = ["waiting", "called", "in_service", "completed", "cancelled", "no_show", "skipped"] as const;

export const outpatientClinicsTable = sqliteTable("outpatient_clinics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  specialty: text("specialty"),
  doctorName: text("doctor_name").notNull(),
  room: text("room"),
  phone: text("phone"),
  dailyCapacity: integer("daily_capacity").notNull().default(30),
  appointmentDuration: integer("appointment_duration").notNull().default(15),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const outpatientAppointmentsTable = sqliteTable("outpatient_appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull(),
  patientName: text("patient_name").notNull(),
  age: text("age"),
  phone: text("phone"),
  nationalId: text("national_id"),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time"),
  queueNumber: integer("queue_number").notNull(),
  source: text("source").notNull().default("system"),
  status: text("status").notNull().default("waiting"),
  notes: text("notes"),
  publicToken: text("public_token").unique(),
  publicTokenExpiresAt: integer("public_token_expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const insertOutpatientClinicSchema = createInsertSchema(outpatientClinicsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOutpatientAppointmentSchema = createInsertSchema(outpatientAppointmentsTable).omit({ id: true, queueNumber: true, createdAt: true, updatedAt: true });
export type OutpatientClinic = typeof outpatientClinicsTable.$inferSelect;
export type OutpatientAppointment = typeof outpatientAppointmentsTable.$inferSelect;
export type InsertOutpatientClinic = z.infer<typeof insertOutpatientClinicSchema>;
export type InsertOutpatientAppointment = z.infer<typeof insertOutpatientAppointmentSchema>;
