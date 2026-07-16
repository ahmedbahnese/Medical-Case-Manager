import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, departmentsTable, medicalCasesTable } from "@workspace/db";
import { GetDepartmentParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/departments", async (req, res): Promise<void> => {
  const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.id);

  // Get active cases count per department
  const activeCounts = await db
    .select({
      departmentId: medicalCasesTable.departmentId,
      count: count(),
    })
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.status, "active"))
    .groupBy(medicalCasesTable.departmentId);

  const countMap = new Map(activeCounts.map((r) => [r.departmentId, Number(r.count)]));

  const result = departments.map((d) => ({
    ...d,
    activeCasesCount: countMap.get(d.id) ?? 0,
  }));

  res.json(result);
});

router.get("/departments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDepartmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [department] = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.id, params.data.id));

  if (!department) {
    res.status(404).json({ error: "القسم غير موجود" });
    return;
  }

  const cases = await db
    .select()
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.departmentId, params.data.id))
    .orderBy(medicalCasesTable.admissionDate);

  const activeCasesCount = cases.filter((c) => c.status === "active").length;

  res.json({
    ...department,
    activeCasesCount,
    cases: cases.map((c) => ({
      ...c,
      departmentName: department.name,
    })),
  });
});

export default router;
