import { Router, type IRouter } from "express";
import { eq, and, ilike, ne, SQL } from "drizzle-orm";
import { db, medicalCasesTable, departmentsTable } from "@workspace/db";
import {
  GetCasesQueryParams,
  CreateCaseBody,
  GetCaseParams,
  UpdateCaseParams,
  UpdateCaseBody,
  DeleteCaseParams,
  BulkImportCasesBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper to join with department name
async function enrichCaseWithDepartment(c: typeof medicalCasesTable.$inferSelect) {
  const [dept] = await db
    .select({ name: departmentsTable.name })
    .from(departmentsTable)
    .where(eq(departmentsTable.id, c.departmentId));
  return { ...c, departmentName: dept?.name ?? null };
}

router.get("/cases/respiration", async (req, res): Promise<void> => {
  const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : null;

  const conditions: SQL[] = [ne(medicalCasesTable.artificialRespiration, "no")];
  if (departmentId) {
    conditions.push(eq(medicalCasesTable.departmentId, departmentId));
  }

  const cases = await db
    .select()
    .from(medicalCasesTable)
    .where(and(...conditions))
    .orderBy(medicalCasesTable.admissionDate);

  const departments = await db.select().from(departmentsTable);
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  res.json(
    cases.map((c) => ({ ...c, departmentName: deptMap.get(c.departmentId) ?? null }))
  );
});

router.get("/cases/bulk-import", async (_req, res): Promise<void> => {
  res.status(405).json({ error: "Method not allowed" });
});

router.get("/cases", async (req, res): Promise<void> => {
  const query = GetCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (query.data.departmentId != null) {
    conditions.push(eq(medicalCasesTable.departmentId, query.data.departmentId));
  }
  if (query.data.status != null) {
    conditions.push(eq(medicalCasesTable.status, query.data.status as any));
  }
  if (query.data.artificialRespiration != null) {
    conditions.push(eq(medicalCasesTable.artificialRespiration, query.data.artificialRespiration as any));
  }
  if (query.data.patientName) {
    conditions.push(ilike(medicalCasesTable.patientName, `%${query.data.patientName}%`));
  }
  if (query.data.nationalId) {
    conditions.push(ilike(medicalCasesTable.nationalId, `%${query.data.nationalId}%`));
  }
  if (query.data.fileNumber) {
    conditions.push(ilike(medicalCasesTable.fileNumber, `%${query.data.fileNumber}%`));
  }

  const cases = await db
    .select()
    .from(medicalCasesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(medicalCasesTable.admissionDate);

  const departments = await db.select().from(departmentsTable);
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  res.json(
    cases.map((c) => ({ ...c, departmentName: deptMap.get(c.departmentId) ?? null }))
  );
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { patientName, departmentId, age, diagnosis, symptoms, treatment, notes,
    parentName, parentPhone, nationalId, fileNumber, caseType, artificialRespiration, status } = parsed.data;

  const [newCase] = await db.insert(medicalCasesTable).values({
    patientName,
    departmentId,
    age: age ?? null,
    diagnosis: diagnosis ?? null,
    symptoms: symptoms ?? null,
    treatment: treatment ?? null,
    notes: notes ?? null,
    parentName: parentName ?? null,
    parentPhone: parentPhone ?? null,
    nationalId: nationalId ?? null,
    fileNumber: fileNumber ?? null,
    caseType: (caseType as any) ?? "intensive_care_high",
    artificialRespiration: (artificialRespiration as any) ?? "no",
    status: (status as any) ?? "active",
  }).returning();

  const enriched = await enrichCaseWithDepartment(newCase);
  res.status(201).json(enriched);
});

router.post("/cases/bulk-import", async (req, res): Promise<void> => {
  const parsed = BulkImportCasesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, departmentId } = parsed.data;

  // Parse Arabic text — extract case blocks separated by common delimiters
  const parsedCases = parseArabicCasesText(text, departmentId ?? null);

  // If confirm=true in the body, actually save the cases
  const toSave: typeof parsedCases = (parsed.data as any).confirm === true ? parsedCases : [];
  let importedCount = 0;

  for (const c of toSave) {
    try {
      await db.insert(medicalCasesTable).values({
        patientName: c.patientName,
        departmentId: c.departmentId ?? 1,
        age: c.age,
        diagnosis: c.diagnosis,
        notes: c.notes,
        parentPhone: c.parentPhone,
        nationalId: c.nationalId,
        artificialRespiration: (c.artificialRespiration as any) ?? "no",
        caseType: "intensive_care_high",
        status: "active",
      });
      importedCount++;
    } catch (_) { /* skip invalid */ }
  }

  res.json({ parsed: parsedCases, imported: importedCount });
});

function parseArabicCasesText(text: string, defaultDeptId: number | null | undefined) {
  const results: Array<{
    patientName: string;
    age: string | null;
    diagnosis: string | null;
    parentPhone: string | null;
    nationalId: string | null;
    notes: string | null;
    artificialRespiration: string | null;
    departmentId: number | null;
  }> = [];

  // Split on line breaks, numbered lists, or dashes
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  let currentCase: (typeof results)[0] | null = null;

  for (const line of lines) {
    // Detect start of a new case: a name-like line (no colon or special prefix)
    const nameMatch = line.match(/^(?:\d+[.)]\s*)?([^\d:،,]{3,40})(?:$|[،,])/);
    const phoneMatch = line.match(/(?:هاتف|تليفون|رقم|موبايل)[:\s]*([0-9+\-\s]{8,15})/i);
    const ageMatch = line.match(/(?:العمر|عمره|عمرها|سن)[:\s]*([^\n,،]{1,20})/i);
    const diagMatch = line.match(/(?:التشخيص|تشخيص|الحالة|مرض)[:\s]*([^\n]{3,100})/i);
    const natIdMatch = line.match(/(?:قومي|رقم قومي|هوية)[:\s]*(\d{10,14})/i);
    const respMatch = line.match(/(?:تنفس|تنفس صناعي)[:\s]*([^\n،,]{3,30})/i);

    if (nameMatch && !phoneMatch && !ageMatch && !diagMatch) {
      // Save previous case
      if (currentCase) results.push(currentCase);
      currentCase = {
        patientName: nameMatch[1].trim(),
        age: null,
        diagnosis: null,
        parentPhone: null,
        nationalId: null,
        notes: null,
        artificialRespiration: null,
        departmentId: defaultDeptId ?? null,
      };
    }

    if (currentCase) {
      if (phoneMatch) currentCase.parentPhone = phoneMatch[1].trim();
      if (ageMatch) currentCase.age = ageMatch[1].trim();
      if (diagMatch) currentCase.diagnosis = diagMatch[1].trim();
      if (natIdMatch) currentCase.nationalId = natIdMatch[1].trim();
      if (respMatch) {
        const r = respMatch[1].toLowerCase();
        if (r.includes("عالي") || r.includes("تردد")) currentCase.artificialRespiration = "high_frequency";
        else if (r.includes("فنت") || r.includes("vent")) currentCase.artificialRespiration = "vent";
        else if (r.includes("سي باب") || r.includes("cpap")) currentCase.artificialRespiration = "cpap";
        else if (r.includes("استعداد")) currentCase.artificialRespiration = "standby";
        else currentCase.artificialRespiration = "no";
      }
    }
  }

  if (currentCase) results.push(currentCase);

  // Fallback: if no cases were parsed but text has content, treat whole text as one patient name
  if (results.length === 0 && text.trim().length > 0) {
    const firstLine = lines[0];
    if (firstLine) {
      results.push({
        patientName: firstLine.replace(/^\d+[.)]\s*/, "").trim(),
        age: null,
        diagnosis: null,
        parentPhone: null,
        nationalId: null,
        notes: text.trim(),
        artificialRespiration: null,
        departmentId: defaultDeptId ?? null,
      });
    }
  }

  return results;
}

router.get("/cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCaseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [c] = await db
    .select()
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.id, params.data.id));

  if (!c) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  const enriched = await enrichCaseWithDepartment(c);
  res.json(enriched);
});

router.patch("/cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCaseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateCaseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = { ...body.data, updatedAt: new Date() };

  const [updated] = await db
    .update(medicalCasesTable)
    .set(updates)
    .where(eq(medicalCasesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  const enriched = await enrichCaseWithDepartment(updated);
  res.json(enriched);
});

router.delete("/cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCaseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(medicalCasesTable)
    .where(eq(medicalCasesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  res.json({ success: true });
});

export default router;
