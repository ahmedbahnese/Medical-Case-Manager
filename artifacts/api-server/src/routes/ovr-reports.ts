import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, like } from "drizzle-orm";
import { db, ovrReportsTable } from "@workspace/db";
import { logAction } from "./audit-logs";
import { getCurrentUserAccess } from "../middleware/auth";

const router: IRouter = Router();
const canReview = (a: Awaited<ReturnType<typeof getCurrentUserAccess>>) => a.isFounder || a.role === "quality";

router.get("/ovr-reports", async (req, res) => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!canReview(access)) { res.status(403).json({ error: "عرض OVR يتطلب صلاحية المؤسس أو مسؤول الجودة" }); return; }
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const department = typeof req.query.department === "string" ? req.query.department.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const from = typeof req.query.from === "string" && req.query.from ? new Date(`${req.query.from}T00:00:00`) : null;
    const to = typeof req.query.to === "string" && req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : null;
    const filters = [
      department ? eq(ovrReportsTable.department, department) : undefined,
      status ? eq(ovrReportsTable.status, status) : undefined,
      from && !Number.isNaN(from.getTime()) ? gte(ovrReportsTable.eventDate, from) : undefined,
      to && !Number.isNaN(to.getTime()) ? lte(ovrReportsTable.eventDate, to) : undefined,
      q ? like(ovrReportsTable.description, `%${q}%`) : undefined,
    ].filter(Boolean) as any[];
    const reports = await db.select().from(ovrReportsTable)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(ovrReportsTable.createdAt));
    res.json(reports);
  } catch (error) {
    console.error("OVR list failed", error);
    res.status(500).json({ error: "تعذر تحميل بلاغات OVR. تحقق من تحديث قاعدة البيانات." });
  }
});

router.post("/ovr-reports", async (req, res) => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.canSubmitOvr) { res.status(403).json({ error: "يجب تسجيل الدخول لإرسال OVR" }); return; }
  const b = req.body as any;
  if (!b.eventDate || !b.department || !b.location || !b.eventType || !b.description) { res.status(400).json({ error: "التاريخ والقسم والمكان والنوع والوصف مطلوبة" }); return; }
  try {
    const eventDate = new Date(b.eventDate);
    if (Number.isNaN(eventDate.getTime())) { res.status(400).json({ error: "تاريخ الواقعة غير صحيح" }); return; }
    const reportNumber = `OVR-${eventDate.getFullYear()}-${Date.now().toString().slice(-6)}`;
    const [created] = await db.insert(ovrReportsTable).values({
      reportNumber,
      eventDate,
      eventTime: b.eventTime?.trim() || null,
      department: String(b.department).trim(),
      location: String(b.location).trim(),
      eventType: String(b.eventType).trim(),
      patientName: b.patientName?.trim() || null,
      fileNumber: b.fileNumber?.trim() || null,
      hospitalSupervision: b.hospitalSupervision?.trim() || null,
      administrativeManager: b.administrativeManager?.trim() || null,
      severity: b.severity || "no_harm",
      description: String(b.description).trim(),
      immediateAction: b.immediateAction?.trim() || null,
      reporterName: access.name,
      reporterRole: access.role,
    }).returning();
    await logAction("إرسال OVR Incident Report", "ovr_report", created.id, reportNumber, null, access.name);
    res.status(201).json(created);
  } catch (error) {
    console.error("OVR create failed", error);
    res.status(500).json({ error: "تعذر حفظ بلاغ OVR. راجع سجل الخادم وتأكد من تحديث قاعدة البيانات." });
  }
});

router.patch("/ovr-reports/:id", async (req, res) => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!canReview(access)) { res.status(403).json({ error: "التحقيق في OVR متاح للمؤسس ومسؤول الجودة فقط" }); return; }
  const id = Number(req.params.id);
  const b = req.body as any;
  const now = new Date();
  const updates: any = { updatedAt: now, reviewedBy: access.name, reviewedAt: now };
  if (b.status === "closed") { updates.closedBy = access.name; updates.closedAt = now; }
  for (const k of ["status","severity","investigationSummary","rootCause","correctiveAction","preventiveAction","actionOwner","verificationNotes","dueDate"]) if (b[k] !== undefined) updates[k] = k === "dueDate" && b[k] ? new Date(b[k]) : b[k];
  await db.update(ovrReportsTable).set(updates).where(eq(ovrReportsTable.id, id));
  const [updated] = await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.id, id));
  if (!updated) { res.status(404).json({ error: "البلاغ غير موجود" }); return; }
  await logAction("تحديث تحقيق OVR", "ovr_report", id, updated.reportNumber, null, access.name);
  res.json(updated);
});

export default router;
