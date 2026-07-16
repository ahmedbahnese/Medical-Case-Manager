import { Router, type IRouter } from "express";
import { count, eq, ne } from "drizzle-orm";
import { db, departmentsTable, medicalCasesTable, waitingCasesTable } from "@workspace/db";

const router: IRouter = Router();

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

  res.json({
    totalCases: Number(totalResult?.count ?? 0),
    activeCases: Number(activeResult?.count ?? 0),
    criticalCases: Number(criticalResult?.count ?? 0),
    waitingCases: Number(waitingResult?.count ?? 0),
    onRespiration: Number(respirationResult?.count ?? 0),
    departmentStats,
    respirationBreakdown,
  });
});

export default router;
