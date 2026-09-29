import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const waitingAttachmentCategoryValues = ["xray", "lab", "emergency_front", "emergency_back", "medical_report", "other"] as const;
export type WaitingAttachmentCategory = typeof waitingAttachmentCategoryValues[number];

export const waitingAttachmentsTable = sqliteTable("waiting_case_attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waitingCaseId: integer("waiting_case_id").notNull(),
  category: text("category").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileData: text("file_data").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  uploadedBy: text("uploaded_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type WaitingAttachment = typeof waitingAttachmentsTable.$inferSelect;
