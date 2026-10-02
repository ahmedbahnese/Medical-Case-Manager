import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const outpatientMessageTemplateKeys = ["welcome", "missing_data", "booking_confirmed", "cancelled", "rescheduled", "clinic_unavailable", "queue_followup", "attendance_instructions"] as const;

export const outpatientMessageTemplatesTable = sqliteTable("outpatient_message_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateKey: text("template_key").notNull().unique(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const outpatientServicesTable = sqliteTable("outpatient_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(15),
  capacityPerHour: integer("capacity_per_hour").notNull().default(4),
  workingDays: text("working_days").notNull().default("[]"),
  workStart: text("work_start").notNull().default("09:00"),
  workEnd: text("work_end").notNull().default("14:00"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const outpatientClinicExceptionsTable = sqliteTable("outpatient_clinic_exceptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull(),
  exceptionDate: text("exception_date").notNull(),
  kind: text("kind").notNull().default("closed"),
  reason: text("reason"),
  doctorName: text("doctor_name"),
  workStart: text("work_start"),
  workEnd: text("work_end"),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const outpatientClinicDoctorsTable = sqliteTable("outpatient_clinic_doctors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clinicId: integer("clinic_id").notNull(),
  doctorName: text("doctor_name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const outpatientBookingRequestsTable = sqliteTable("outpatient_booking_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  senderId: text("sender_id"),
  rawText: text("raw_text").notNull(),
  extractedJson: text("extracted_json").notNull().default("{}"),
  missingFieldsJson: text("missing_fields_json").notNull().default("[]"),
  status: text("status").notNull().default("needs_review"),
  appointmentId: integer("appointment_id"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const outpatientMessageDeliveriesTable = sqliteTable("outpatient_message_deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  recipient: text("recipient"),
  templateKey: text("template_key"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  appointmentId: integer("appointment_id"),
  inboundMessageId: integer("inbound_message_id"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
});
