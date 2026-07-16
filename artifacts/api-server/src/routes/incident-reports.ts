import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, incidentReportsTable, waitingCasesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/incident-reports", async (_req, res): Promise<void> => {
  const reports = await db.select().from(incidentReportsTable).orderBy(desc(incidentReportsTable.createdAt));
  res.json(reports.map(r => ({ ...r, cases: JSON.parse(r.casesJson ?? "[]") })));
});

router.get("/incident-reports/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [report] = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.id, id));
  if (!report) {
    res.status(404).json({ error: "التقرير غير موجود" });
    return;
  }
  res.json({ ...report, cases: JSON.parse(report.casesJson ?? "[]") });
});

router.post("/incident-reports", async (req, res): Promise<void> => {
  const { incidentType, incidentLocation, reportDate, reportDay, reportTime, totalInjured, totalDeaths, hospitalsTransferredTo, cases } = req.body as any;

  if (!incidentType || !incidentLocation || !reportDate) {
    res.status(400).json({ error: "نوع الحادث والمكان والتاريخ مطلوبة" });
    return;
  }

  const [report] = await db.insert(incidentReportsTable).values({
    incidentType,
    incidentLocation,
    reportDate: new Date(reportDate),
    reportDay: reportDay ?? null,
    reportTime: reportTime ?? null,
    totalInjured: totalInjured ?? 0,
    totalDeaths: totalDeaths ?? 0,
    hospitalsTransferredTo: hospitalsTransferredTo ?? null,
    casesJson: JSON.stringify(cases ?? []),
  }).returning();

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
});

router.patch("/incident-reports/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { incidentType, incidentLocation, reportDate, reportDay, reportTime, totalInjured, totalDeaths, hospitalsTransferredTo, cases } = req.body as any;

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

  const [updated] = await db.update(incidentReportsTable).set(updates).where(eq(incidentReportsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "التقرير غير موجود" });
    return;
  }
  res.json({ ...updated, cases: JSON.parse(updated.casesJson ?? "[]") });
});

router.delete("/incident-reports/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [deleted] = await db.delete(incidentReportsTable).where(eq(incidentReportsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "التقرير غير موجود" });
    return;
  }
  res.json({ success: true });
});

export default router;
