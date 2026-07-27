import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Known standard types — kept for reference and frontend display
export const departmentTypeValues = [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator_a",
  "incubator_b",
  "incubator_c",
  "internal",
] as const;

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(10),
  // TEXT instead of ENUM — allows custom department types
  departmentType: text("department_type").notNull(),
  reportFieldsJson: text("report_fields_json").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departmentsTable.$inferSelect;
