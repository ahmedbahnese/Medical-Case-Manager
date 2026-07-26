import { mysqlTable, int, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const departmentTypeValues = [
  "intensive_care_high",
  "intensive_care_medium",
  "picu",
  "incubator_a",
  "incubator_b",
  "incubator_c",
  "internal",
] as const;

export const departmentsTable = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  capacity: int("capacity").notNull().default(10),
  departmentType: mysqlEnum("department_type", departmentTypeValues).notNull(),
  reportFieldsJson: text("report_fields_json").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departmentsTable.$inferSelect;
