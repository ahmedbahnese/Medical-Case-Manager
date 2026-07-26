import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, departmentsTable, medicalCasesTable } from "@workspace/db";
import { GetDepartmentParams } from "@workspace/api-zod";
import { logAction } from "./audit-logs";
import { getCurrentUserName } from "../middleware/auth";

const router: IRouter = Router();

router.get("/departments", async (req, res): Promise<void> => {
  const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.id);

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

/* ──────────────────────── CRUD (settings-gated) ──────────────────── */

router.post("/departments", async (req, res): Promise<void> => {
  const { name, code, description, capacity, departmentType, reportFields, reportFieldsJson } = req.body as any;
  if (!name || !code || !departmentType) {
    res.status(400).json({ error: "name, code, departmentType مطلوبة" });
    return;
  }

  // MySQL does not support .returning() — use $returningId() + SELECT
  const [{ id: newDeptId }] = await db.insert(departmentsTable).values({
    name,
    code: code.toUpperCase(),
    description: description ?? null,
    capacity: capacity ? Number(capacity) : 10,
    departmentType,
    reportFieldsJson: typeof reportFieldsJson === "string"
      ? reportFieldsJson
      : JSON.stringify(Array.isArray(reportFields) ? reportFields : []),
  }).$returningId();

  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, newDeptId));

  await logAction("إضافة قسم", "department", dept.id, dept.name, `كود: ${dept.code}`, getCurrentUserName(req.headers.cookie));
  res.status(201).json(dept);
});

router.patch("/departments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "id غير صالح" }); return; }

  // Verify the department exists
  const [existing] = await db.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "القسم غير موجود" }); return; }

  const { name, code, description, capacity, departmentType, reportFields, reportFieldsJson } = req.body as any;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (code !== undefined) updates.code = String(code).toUpperCase();
  if (description !== undefined) updates.description = description;
  if (capacity !== undefined) updates.capacity = Number(capacity);
  if (departmentType !== undefined) updates.departmentType = departmentType;
  if (reportFieldsJson !== undefined) updates.reportFieldsJson = reportFieldsJson;
  else if (reportFields !== undefined) updates.reportFieldsJson = JSON.stringify(Array.isArray(reportFields) ? reportFields : []);

  // MySQL does not support .returning() — update then re-select
  await db.update(departmentsTable).set(updates).where(eq(departmentsTable.id, id));
  const [updated] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));

  await logAction("تعديل قسم", "department", updated.id, updated.name, null, getCurrentUserName(req.headers.cookie));
  res.json(updated);
});

router.delete("/departments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "id غير صالح" }); return; }

  const [{ count: activeCount }] = await db
    .select({ count: count() })
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.departmentId, id));
  if (Number(activeCount) > 0) {
    res.status(409).json({ error: "لا يمكن حذف القسم — يحتوي على حالات نشطة" });
    return;
  }

  // MySQL does not support .returning() — select first, then delete
  const [toDelete] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
  if (!toDelete) { res.status(404).json({ error: "القسم غير موجود" }); return; }

  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));

  await logAction("حذف قسم", "department", toDelete.id, toDelete.name, null, getCurrentUserName(req.headers.cookie));
  res.json({ success: true });
});

export default router;
