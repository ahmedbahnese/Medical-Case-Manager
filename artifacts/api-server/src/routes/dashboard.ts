import { Router, type IRouter } from "express";
import { count, eq, ne, sql } from "drizzle-orm";
import { db, departmentsTable, medicalCasesTable, waitingCasesTable, incidentReportsTable, ovrReportsTable } from "@workspace/db";
import { getCurrentUserAccess } from "../middleware/auth";

const router: IRouter = Router();

router.get("/quality/dashboard", async (req, res): Promise<void> => {
  const access = await getCurrentUserAccess(req.headers.cookie);
  if (!access.canReviewOvr) { res.status(403).json({ error: "لوحة الجودة تتطلب صلاحية المؤسس أو مسؤول الجودة" }); return; }
  const [total] = await db.select({ count: count() }).from(ovrReportsTable);
  const [open] = await db.select({ count: count() }).from(ovrReportsTable).where(ne(ovrReportsTable.status, "closed"));
  const byStatus = await db.select({ status: ovrReportsTable.status, count: count() }).from(ovrReportsTable).groupBy(ovrReportsTable.status);
  const bySeverity = await db.select({ severity: ovrReportsTable.severity, count: count() }).from(ovrReportsTable).groupBy(ovrReportsTable.severity);
  const byType = await db.select({ type: ovrReportsTable.eventType, count: count() }).from(ovrReportsTable).groupBy(ovrReportsTable.eventType);
  const monthlyVisits = await db.select({ month: sql<string>`strftime('%Y-%m', ${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`, count: count() }).from(medicalCasesTable).groupBy(sql`strftime('%Y-%m', ${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`).orderBy(sql`strftime('%Y-%m', ${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`);
  const departmentVisits = await db.select({ department: medicalCasesTable.departmentId, count: count() }).from(medicalCasesTable).groupBy(medicalCasesTable.departmentId).orderBy(sql`count(*) DESC`);
  const respirationDaily = await db.select({ period: sql<string>`date(${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`, count: count() }).from(medicalCasesTable).where(sql`${medicalCasesTable.artificialRespiration} IN ('high_frequency','vent','cpap','standby')`).groupBy(sql`date(${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`).orderBy(sql`date(${medicalCasesTable.admissionDate} / 1000, 'unixepoch') DESC`).limit(31);
  const respirationWeekly = await db.select({ period: sql<string>`strftime('%Y-W%W', ${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`, count: count() }).from(medicalCasesTable).where(sql`${medicalCasesTable.artificialRespiration} IN ('high_frequency','vent','cpap','standby')`).groupBy(sql`strftime('%Y-W%W', ${medicalCasesTable.admissionDate} / 1000, 'unixepoch')`).orderBy(sql`strftime('%Y-W%W', ${medicalCasesTable.admissionDate} / 1000, 'unixepoch') DESC`).limit(12);
  const [overdue] = await db.select({ count: count() }).from(ovrReportsTable).where(sql`${ovrReportsTable.dueDate} IS NOT NULL AND ${ovrReportsTable.dueDate} < ${Date.now()} AND ${ovrReportsTable.status} <> 'closed'`);
  res.json({ totalOvr: Number(total?.count ?? 0), openOvr: Number(open?.count ?? 0), overdueCapa: Number(overdue?.count ?? 0), byStatus: byStatus.map(r => ({ status: r.status, count: Number(r.count) })), bySeverity: bySeverity.map(r => ({ severity: r.severity, count: Number(r.count) })), byType: byType.map(r => ({ type: r.type, count: Number(r.count) })), monthlyVisits: monthlyVisits.map(r => ({ month: r.month, count: Number(r.count) })), departmentVisits: departmentVisits.map(r => ({ departmentId: r.department, count: Number(r.count) })), respirationPeriods: { daily: respirationDaily.map(r => ({ period: r.period, count: Number(r.count) })), weekly: respirationWeekly.map(r => ({ period: r.period, count: Number(r.count) })), monthly: monthlyVisits.map(r => ({ period: r.month, count: Number(r.count) })) } });
});

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const [totalResult] = await db.select({ count: count() }).from(medicalCasesTable);
  const [activeResult] = await db.select({ count: count() }).from(medicalCasesTable).where(eq(medicalCasesTable.status, "active"));
  const [criticalResult] = await db.select({ count: count() }).from(medicalCasesTable).where(eq(medicalCasesTable.status, "critical"));
  const [waitingResult] = await db.select({ count: count() }).from(waitingCasesTable).where(eq(waitingCasesTable.status, "waiting"));
  const [respirationResult] = await db.select({ count: count() }).from(medicalCasesTable).where(ne(medicalCasesTable.artificialRespiration, "no"));

  const departments = await db.select().from(departmentsTable);

  // Per-department stats
  const activeCounts = await db
    .select({ departmentId: medicalCasesTable.departmentId, count: count() })
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.status, "active"))
    .groupBy(medicalCasesTable.departmentId);

  const criticalCounts = await db
    .select({ departmentId: medicalCasesTable.departmentId, count: count() })
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.status, "critical"))
    .groupBy(medicalCasesTable.departmentId);

  const activeMap = new Map(activeCounts.map((r) => [r.departmentId, Number(r.count)]));
  const criticalMap = new Map(criticalCounts.map((r) => [r.departmentId, Number(r.count)]));

  const departmentStats = departments.map((d) => ({
    departmentId: d.id,
    departmentName: d.name,
    capacity: d.capacity,
    activeCases: activeMap.get(d.id) ?? 0,
    criticalCases: criticalMap.get(d.id) ?? 0,
  }));

  // Respiration breakdown
  const respCounts = await db
    .select({ type: medicalCasesTable.artificialRespiration, count: count() })
    .from(medicalCasesTable)
    .where(ne(medicalCasesTable.artificialRespiration, "no"))
    .groupBy(medicalCasesTable.artificialRespiration);

  const respirationLabels: Record<string, string> = {
    high_frequency: "تردد عالي",
    vent: "فنت (VENT)",
    cpap: "سي باب (CPAP)",
    standby: "استعداد",
  };

  const respirationBreakdown = respCounts.map((r) => ({
    type: r.type,
    count: Number(r.count),
    label: respirationLabels[r.type] ?? r.type,
  }));

  const respirationCount = Number(respirationResult?.count ?? 0);
  res.json({
    totalCases: Number(totalResult?.count ?? 0),
    activeCases: Number(activeResult?.count ?? 0),
    criticalCases: Number(criticalResult?.count ?? 0),
    waitingCases: Number(waitingResult?.count ?? 0),
    onRespiration: respirationCount,
    artificialRespirationCases: respirationCount,
    departmentStats,
    respirationBreakdown,
  });
});

export default router;
