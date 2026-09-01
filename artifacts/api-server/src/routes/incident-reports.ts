import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, incidentReportsTable, waitingCasesTable } from "@workspace/db";
import { logAction } from "./audit-logs";
import { getCurrentUserName, getCurrentUserAccess } from "../middleware/auth";

const router: IRouter = Router();

router.get("/incident-reports", async (req, res): Promise<void> => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.canReviewOvr) { res.status(403).json({ error: "عرض بلاغات OVR يتطلب صلاحية المؤسس أو مسؤول الجودة" }); return; }
  const reports = await db.select().from(incidentReportsTable).orderBy(desc(incidentReportsTable.createdAt));
  res.json(reports.map(r => ({ ...r, cases: JSON.parse(r.casesJson ?? "[]") })));
});

router.get("/incident-reports/:id", async (req, res): Promise<void> => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.canReviewOvr) { res.status(403).json({ error: "عرض بلاغات OVR يتطلب صلاحية المؤسس أو مسؤول الجودة" }); return; }
  const id = parseInt(req.params.id as string, 10);
  const [report] = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.id, id));
  if (!report) {
    res.status(404).json({ error: "التقرير غير موجود" });
    return;
  }
  res.json({ ...report, cases: JSON.parse(report.casesJson ?? "[]") });
});

router.post("/incident-reports", async (req, res): Promise<void> => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  const { incidentType, incidentLocation, reportDate, reportDay, reportTime, totalInjured, totalDeaths, hospitalsTransferredTo, cases, severity, eventDescription, immediateAction, reporterName, reporterRole } = req.body as any;

  if (!incidentType || !incidentLocation || !reportDate) {
    res.status(400).json({ error: "نوع الحادث والمكان والتاريخ مطلوبة" });
    return;
  }

  const [{ id: newReportId }] = await db.insert(incidentReportsTable).values({
    incidentType,
    incidentLocation,
    reportDate: new Date(reportDate),
    reportDay: reportDay ?? null,
    reportTime: reportTime ?? null,
    totalInjured: totalInjured ?? 0,
    totalDeaths: totalDeaths ?? 0,
    hospitalsTransferredTo: hospitalsTransferredTo ?? null,
    casesJson: JSON.stringify(cases ?? []),
    reporterName: reporterName ?? access.name,
    reporterRole: reporterRole ?? access.role,
    status: "new",
    severity: severity ?? "no_harm",
    eventDescription: eventDescription ?? null,
    immediateAction: immediateAction ?? null,
  }).returning({ id: incidentReportsTable.id });

  const [report] = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.id, newReportId));

  // Auto-save each case as a waiting case in reception
  const casesArr: any[] = cases ?? [];
  for (const c of casesArr) {
    if (c.name) {
      try {
        await db.insert(waitingCasesTable).values({
          patientName: c.name,
          age: c.age ?? null,
          diagnosis: c.diagnosis ?? null,
          careType: "intensive_care_high",
          section: "reception",
          status: "waiting",
          centralRoomRequired: false,
          artificialRespiration: "no",
        });
      } catch { /* skip if invalid */ }
    }
  }

  res.status(201).json({ ...report, cases: JSON.parse(report.casesJson ?? "[]") });
  await logAction("إضافة تقرير حادث", "incident_report", report.id, report.incidentType, null, getCurrentUserName(req.headers.cookie));
});

router.patch("/incident-reports/:id", async (req, res): Promise<void> => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.canReviewOvr) { res.status(403).json({ error: "تعديل والتحقيق في OVR يتطلب صلاحية المؤسس أو مسؤول الجودة" }); return; }
  const id = parseInt(req.params.id as string, 10);

  // Verify existence
  const [existing] = await db.select({ id: incidentReportsTable.id }).from(incidentReportsTable).where(eq(incidentReportsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "التقرير غير موجود" });
    return;
  }

  const { incidentType, incidentLocation, reportDate, reportDay, reportTime, totalInjured, totalDeaths, hospitalsTransferredTo, cases, status, severity, eventDescription, immediateAction, investigationSummary, rootCause, correctiveAction, preventiveAction, actionOwner, dueDate, verificationNotes } = req.body as any;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (incidentType !== undefined) updates.incidentType = incidentType;
  if (incidentLocation !== undefined) updates.incidentLocation = incidentLocation;
  if (reportDate !== undefined) updates.reportDate = new Date(reportDate);
  if (reportDay !== undefined) updates.reportDay = reportDay;
  if (reportTime !== undefined) updates.reportTime = reportTime;
  if (totalInjured !== undefined) updates.totalInjured = totalInjured;
  if (totalDeaths !== undefined) updates.totalDeaths = totalDeaths;
  if (hospitalsTransferredTo !== undefined) updates.hospitalsTransferredTo = hospitalsTransferredTo;
  if (cases !== undefined) updates.casesJson = JSON.stringify(cases);
  for (const [key, value] of Object.entries({ status, severity, eventDescription, immediateAction, investigationSummary, rootCause, correctiveAction, preventiveAction, actionOwner, verificationNotes })) {
    if (value !== undefined) updates[key] = value;
  }
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
  updates.reviewedBy = access.name;
  updates.reviewedAt = new Date();

  // MySQL does not support .returning() — update then re-select
  await db.update(incidentReportsTable).set(updates).where(eq(incidentReportsTable.id, id));
  const [updated] = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.id, id));

  res.json({ ...updated, cases: JSON.parse(updated.casesJson ?? "[]") });
  await logAction("تعديل تقرير حادث", "incident_report", updated.id, updated.incidentType, null, getCurrentUserName(req.headers.cookie));
});

router.delete("/incident-reports/:id", async (req, res): Promise<void> => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.isFounder) { res.status(403).json({ error: "حذف بلاغ OVR متاح للمؤسس فقط" }); return; }
  const id = parseInt(req.params.id as string, 10);

  // MySQL does not support .returning() — select first, then delete
  const [toDelete] = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.id, id));
  if (!toDelete) {
    res.status(404).json({ error: "التقرير غير موجود" });
    return;
  }

  await db.delete(incidentReportsTable).where(eq(incidentReportsTable.id, id));

  await logAction("حذف تقرير حادث", "incident_report", toDelete.id, toDelete.incidentType, "تم حذف التقرير", getCurrentUserName(req.headers.cookie));
  res.json({ success: true });
});

export default router;
