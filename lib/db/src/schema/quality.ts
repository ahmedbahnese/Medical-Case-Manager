import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const ovrReportsTable = sqliteTable("ovr_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ovrNumber: text("ovr_number").notNull().unique(),
  eventDate: integer("event_date", { mode: "timestamp_ms" }).notNull(),
  departmentId: integer("department_id"),
  location: text("location").notNull(),
  category: text("category").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterAccount: text("reporter_account"),
  patientRelated: integer("patient_related", { mode: "boolean" }).notNull().default(false),
  patientId: integer("patient_id"),
  patientName: text("patient_name"),
  hospitalNumber: text("hospital_number"),
  attendingDoctor: text("attending_doctor"),
  nursingSupervisor: text("nursing_supervisor"),
  administrativeManager: text("administrative_manager"),
  impact: text("impact").notNull().default("No Harm"),
  immediateAction: text("immediate_action"),
  correctiveAction: text("corrective_action"),
  actionOwner: text("action_owner"),
  attachmentsJson: text("attachments_json").notNull().default("[]"),
  notes: text("notes"),
  status: text("status").notNull().default("New"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const qualityInvestigationsTable = sqliteTable("quality_investigations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ovrId: integer("ovr_id").notNull(),
  contributingCauses: text("contributing_causes"),
  rootCause: text("root_cause"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  investigatedBy: text("investigated_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const capaRecordsTable = sqliteTable("capa_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capaNumber: text("capa_number").notNull().unique(),
  ovrId: integer("ovr_id"),
  departmentId: integer("department_id"),
  problemFinding: text("problem_finding").notNull(),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action").notNull(),
  preventiveAction: text("preventive_action"),
  responsiblePerson: text("responsible_person").notNull(),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  priority: text("priority").notNull().default("Medium"),
  status: text("status").notNull().default("Open"),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  implementationDate: integer("implementation_date", { mode: "timestamp_ms" }),
  verification: text("verification"),
  verificationResult: text("verification_result"),
  closureDate: integer("closure_date", { mode: "timestamp_ms" }),
  closedBy: text("closed_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const qualityRisksTable = sqliteTable("quality_risks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  risk: text("risk").notNull(),
  departmentId: integer("department_id"),
  probability: integer("probability").notNull().default(1),
  impact: integer("impact").notNull().default(1),
  riskLevel: text("risk_level").notNull().default("Low"),
  mitigation: text("mitigation"),
  responsiblePerson: text("responsible_person"),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  status: text("status").notNull().default("Open"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const qualityAuditsTable = sqliteTable("quality_audits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  departmentId: integer("department_id"),
  auditDate: integer("audit_date", { mode: "timestamp_ms" }).notNull(),
  notes: text("notes"),
  findings: text("findings"),
  nonConformity: text("non_conformity"),
  requiredActions: text("required_actions"),
  status: text("status").notNull().default("Open"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const qualityIndicatorsTable = sqliteTable("quality_indicators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  source: text("source").notNull().default("manual"),
  target: text("target"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const qualityNotificationsTable = sqliteTable("quality_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipient: text("recipient").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type OvrReport = typeof ovrReportsTable.$inferSelect;
export type CapaRecord = typeof capaRecordsTable.$inferSelect;
