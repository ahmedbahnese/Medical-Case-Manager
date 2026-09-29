import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, waitingAttachmentsTable, waitingCasesTable } from "@workspace/db";
import { getCurrentUserName, requirePageAccess } from "../middleware/auth";

const router = Router();
const categories = new Set(["xray", "lab", "emergency_front", "emergency_back", "medical_report", "other"]);

router.get("/waiting-cases/:id/attachments", requirePageAccess("/waiting-cases"), async (req, res) => {
  const caseId = Number(req.params.id);
  if (!Number.isInteger(caseId)) { res.status(400).json({ error: "معرف الحالة غير صالح" }); return; }
  const files = await db.select({ id: waitingAttachmentsTable.id, waitingCaseId: waitingAttachmentsTable.waitingCaseId, category: waitingAttachmentsTable.category, fileName: waitingAttachmentsTable.fileName, mimeType: waitingAttachmentsTable.mimeType, isCurrent: waitingAttachmentsTable.isCurrent, uploadedBy: waitingAttachmentsTable.uploadedBy, createdAt: waitingAttachmentsTable.createdAt }).from(waitingAttachmentsTable).where(eq(waitingAttachmentsTable.waitingCaseId, caseId)).orderBy(asc(waitingAttachmentsTable.createdAt));
  res.json(files);
});

router.post("/waiting-cases/:id/attachments", requirePageAccess("/waiting-cases", "edit"), async (req, res) => {
  const caseId = Number(req.params.id);
  const body = req.body ?? {};
  const category = String(body.category ?? "other");
  const fileData = String(body.fileData ?? "");
  const fileName = String(body.fileName ?? "").trim();
  const mimeType = String(body.mimeType ?? "application/octet-stream");
  if (!Number.isInteger(caseId) || !categories.has(category) || !fileName || !fileData.startsWith("data:")) { res.status(400).json({ error: "بيانات المرفق غير مكتملة" }); return; }
  if (fileData.length > 18 * 1024 * 1024) { res.status(413).json({ error: "حجم المرفق أكبر من الحد المسموح" }); return; }
  const [waitingCase] = await db.select({ id: waitingCasesTable.id }).from(waitingCasesTable).where(eq(waitingCasesTable.id, caseId));
  if (!waitingCase) { res.status(404).json({ error: "الحالة غير موجودة" }); return; }
  if (["medical_report", "emergency_front", "emergency_back"].includes(category)) await db.update(waitingAttachmentsTable).set({ isCurrent: false }).where(and(eq(waitingAttachmentsTable.waitingCaseId, caseId), eq(waitingAttachmentsTable.category, category)));
  const [{ id }] = await db.insert(waitingAttachmentsTable).values({ waitingCaseId: caseId, category, fileName, mimeType, fileData, isCurrent: true, uploadedBy: getCurrentUserName(req.headers.cookie) }).returning({ id: waitingAttachmentsTable.id });
  const [created] = await db.select({ id: waitingAttachmentsTable.id, waitingCaseId: waitingAttachmentsTable.waitingCaseId, category: waitingAttachmentsTable.category, fileName: waitingAttachmentsTable.fileName, mimeType: waitingAttachmentsTable.mimeType, isCurrent: waitingAttachmentsTable.isCurrent, uploadedBy: waitingAttachmentsTable.uploadedBy, createdAt: waitingAttachmentsTable.createdAt }).from(waitingAttachmentsTable).where(eq(waitingAttachmentsTable.id, id));
  res.status(201).json(created);
});

router.get("/waiting-case-attachments/:id/download", requirePageAccess("/waiting-cases"), async (req, res) => {
  const id = Number(req.params.id);
  const [file] = await db.select().from(waitingAttachmentsTable).where(eq(waitingAttachmentsTable.id, id));
  if (!file) { res.status(404).json({ error: "المرفق غير موجود" }); return; }
  res.json(file);
});

router.delete("/waiting-case-attachments/:id", requirePageAccess("/waiting-cases", "edit"), async (req, res) => {
  const id = Number(req.params.id);
  const [file] = await db.select({ id: waitingAttachmentsTable.id }).from(waitingAttachmentsTable).where(eq(waitingAttachmentsTable.id, id));
  if (!file) { res.status(404).json({ error: "المرفق غير موجود" }); return; }
  await db.delete(waitingAttachmentsTable).where(eq(waitingAttachmentsTable.id, id));
  res.json({ success: true });
});

export default router;
