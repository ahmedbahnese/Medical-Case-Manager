import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ovrReportsTable } from "@workspace/db";
import { logAction } from "./audit-logs";
import { getCurrentUserAccess } from "../middleware/auth";

const router: IRouter = Router();
const canReview = (a: Awaited<ReturnType<typeof getCurrentUserAccess>>) => a.isFounder || a.role === "quality";

router.get("/ovr-reports", async (req, res) => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!canReview(access)) { res.status(403).json({ error: "عرض OVR يتطلب صلاحية المؤسس أو مسؤول الجودة" }); return; }
  res.json(await db.select().from(ovrReportsTable).orderBy(desc(ovrReportsTable.createdAt)));
});

router.post("/ovr-reports", async (req, res) => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.canSubmitOvr) { res.status(403).json({ error: "يجب تسجيل الدخول لإرسال OVR" }); return; }
  const b = req.body as any;
  if (!b.eventDate || !b.department || !b.location || !b.eventType || !b.description) { res.status(400).json({ error: "التاريخ والقسم والمكان والنوع والوصف مطلوبة" }); return; }
  const reportNumber = `OVR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const [created] = await db.insert(ovrReportsTable).values({ reportNumber, eventDate: new Date(b.eventDate), eventTime: b.eventTime ?? null, department: b.department, location: b.location, eventType: b.eventType, patientName: b.patientName ?? null, fileNumber: b.fileNumber ?? null, hospitalSupervision: b.hospitalSupervision ?? "إشراف المستشفى", administrativeManager: b.administrativeManager ?? "المدير الإداري", severity: b.severity ?? "no_harm", description: b.description, immediateAction: b.immediateAction ?? null, reporterName: access.name, reporterRole: access.role }).returning();
  await logAction("إرسال OVR Incident Report", "ovr_report", created.id, reportNumber, null, access.name);
  res.status(201).json(created);
});

router.patch("/ovr-reports/:id", async (req, res) => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!canReview(access)) { res.status(403).json({ error: "التحقيق في OVR متاح للمؤسس ومسؤول الجودة فقط" }); return; }
  const id = Number(req.params.id);
  const b = req.body as any;
  if (b.status === "closed" && !String(b.closedBy ?? "").trim()) { res.status(400).json({ error: "اسم مسؤول الإغلاق مطلوب عند غلق البلاغ" }); return; }
  const updates: any = { updatedAt: new Date(), reviewedBy: access.name, reviewedAt: new Date() };
  for (const k of ["status","severity","investigationSummary","rootCause","correctiveAction","preventiveAction","actionOwner","verificationNotes","dueDate","investigatorName","investigationDate","closedBy","closedAt"]) if (b[k] !== undefined) updates[k] = ["dueDate","investigationDate","closedAt"].includes(k) && b[k] ? new Date(b[k]) : (b[k] || null);
  if (b.status !== "closed") { updates.closedBy = null; updates.closedAt = null; }
  await db.update(ovrReportsTable).set(updates).where(eq(ovrReportsTable.id, id));
  const [updated] = await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.id, id));
  if (!updated) { res.status(404).json({ error: "البلاغ غير موجود" }); return; }
  await logAction("تحديث تحقيق OVR", "ovr_report", id, updated.reportNumber, null, access.name);
  res.json(updated);
});

export default router;
