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
import { logAction } from "./audit-logs";

const router: IRouter = Router();

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

  const {
    patientName, departmentId, age, diagnosis, symptoms, treatment, notes,
    parentName, parentPhone, nationalId, fileNumber, caseType, artificialRespiration, status
  } = parsed.data;

  const extraData = req.body as any;

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
    mobe: extraData.mobe ?? null,
    ventilationStartDate: extraData.ventilationStartDate ? new Date(extraData.ventilationStartDate) : null,
    ventilationEndDate: extraData.ventilationEndDate ? new Date(extraData.ventilationEndDate) : null,
    admissionDate: extraData.admissionDate ? new Date(extraData.admissionDate) : new Date(),
  }).returning();

  await logAction("إضافة حالة", "case", newCase.id, patientName, `تم إضافة حالة جديدة للقسم رقم ${departmentId}`);

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
  const parsedCases = parseArabicCasesText(text, departmentId ?? null);

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
  type ParsedCase = {
    patientName: string;
    age: string | null;
    diagnosis: string | null;
    parentPhone: string | null;
    nationalId: string | null;
    notes: string | null;
    artificialRespiration: string | null;
    departmentId: number | null;
  };
  const results: ParsedCase[] = [];
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let currentCase: ParsedCase | null = null;

  // Strip Arabic/Western digit prefixes (١-, ١., 1-, 1.) from a line
  const stripPrefix = (l: string) => l.replace(/^[\u0660-\u0669\d]+[\.\-\)،\s]*/, "").trim();

  for (const line of lines) {
    const stripped = stripPrefix(line);

    // Structured field detection
    const phoneMatch = line.match(/(?:هاتف|تليفون|رقم|موبايل|تلفون|phone)[:\s]*([0-9+\-\s]{8,15})/i)
                    ?? line.match(/\b(01[0-9]{9})\b/);
    const ageMatch = line.match(/(?:العمر|عمره|عمرها|عمر|سن|السن|age)[:\s]*([^\n,،]{1,25})/i);
    const diagMatch = line.match(/(?:التشخيص|تشخيص|الحالة|مرض|dx|diagnosis)[:\s]*([^\n]{3,150})/i);
    const natIdMatch = line.match(/(?:قومي|رقم قومي|هوية)[:\s]*(\d{10,14})/i);

    // Respiration — each mode separately (order matters)
    const respHF     = /(?:تردد عالي|عالي التردد|HFO|HFOV)\b/i.test(line);
    const respVent   = /(?:فنت|تهوية آلية|\bVent\b|\bMV\b|\bPCV\b)/i.test(line);
    const respHFNC   = /\bHFNC\b/i.test(line);
    const respCpap   = /(?:CPAP|سباب|سي باب)/i.test(line);
    const respBox    = /(?:بوكس|نيزل كانيولا|nasal cannula|\bbox\b)/i.test(line);
    const respStandby= /(?:استاندباي|استعداد|\bstandby\b)/i.test(line);
    const hasResp = respHF || respVent || respHFNC || respCpap || respBox || respStandby;

    // Check if line looks like a name (Arabic, length < 70, no structured markers)
    const looksArabic = /[\u0600-\u06FF]/.test(stripped);
    const isNameLine = looksArabic
      && !phoneMatch && !ageMatch && !diagMatch && !natIdMatch && !hasResp
      && stripped.length >= 3 && stripped.length < 70;

    // Also detect "Name، age" pattern on same line (e.g. "محمد احمد، 3 أيام")
    const inlinAgeMatch = isNameLine
      ? stripped.match(/^(.{3,40})[،,]\s*(.{2,20})$/)
      : null;

    if (isNameLine) {
      if (currentCase) results.push(currentCase);
      const cleanName = inlinAgeMatch ? inlinAgeMatch[1].trim() : stripped;
      const inlineAge = inlinAgeMatch ? inlinAgeMatch[2].trim() : null;
      currentCase = {
        patientName: cleanName,
        age: inlineAge,
        diagnosis: null,
        parentPhone: null,
        nationalId: null,
        notes: null,
        artificialRespiration: null,
        departmentId: defaultDeptId ?? null,
      };
    }

    if (currentCase) {
      if (phoneMatch && !currentCase.parentPhone) currentCase.parentPhone = (phoneMatch[1] ?? phoneMatch[0]).trim();
      if (ageMatch && !currentCase.age) currentCase.age = ageMatch[1].trim();
      if (diagMatch && !currentCase.diagnosis) currentCase.diagnosis = diagMatch[1].trim();
      if (natIdMatch && !currentCase.nationalId) currentCase.nationalId = natIdMatch[1].trim();
      if (hasResp && !currentCase.artificialRespiration) {
        if (respHF)      currentCase.artificialRespiration = "high_frequency";
        else if (respVent)    currentCase.artificialRespiration = "vent";
        else if (respHFNC)   currentCase.artificialRespiration = "hfnc";
        else if (respCpap)   currentCase.artificialRespiration = "cpap";
        else if (respBox)    currentCase.artificialRespiration = "box";
        else if (respStandby) currentCase.artificialRespiration = "standby";
      }
    }
  }

  if (currentCase) results.push(currentCase);

  // Fallback: treat whole block as one patient
  if (results.length === 0 && text.trim().length > 0) {
    const firstLine = lines[0];
    if (firstLine) {
      results.push({
        patientName: stripPrefix(firstLine),
        age: null, diagnosis: null, parentPhone: null,
        nationalId: null, notes: text.trim(),
        artificialRespiration: null, departmentId: defaultDeptId ?? null,
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

  const extraData = req.body as any;
  const updates: Record<string, unknown> = {
    ...body.data,
    updatedAt: new Date(),
  };

  // Handle extra fields not in the Zod schema
  if (extraData.mobe !== undefined) updates.mobe = extraData.mobe;
  if (extraData.ventilationStartDate !== undefined) {
    updates.ventilationStartDate = extraData.ventilationStartDate ? new Date(extraData.ventilationStartDate) : null;
  }
  if (extraData.ventilationEndDate !== undefined) {
    updates.ventilationEndDate = extraData.ventilationEndDate ? new Date(extraData.ventilationEndDate) : null;
  }
  if (extraData.dischargeReason !== undefined) updates.dischargeReason = extraData.dischargeReason;
  if (extraData.admissionDate !== undefined) {
    updates.admissionDate = extraData.admissionDate ? new Date(extraData.admissionDate) : undefined;
  }
  if (extraData.departmentId !== undefined) {
    updates.departmentId = parseInt(extraData.departmentId, 10);
  }

  // If discharging, set dischargeDate automatically
  if (body.data.status === "discharged" && !extraData.dischargeDate) {
    updates.dischargeDate = new Date();
  } else if (extraData.dischargeDate !== undefined) {
    updates.dischargeDate = extraData.dischargeDate ? new Date(extraData.dischargeDate) : null;
  }

  const [updated] = await db
    .update(medicalCasesTable)
    .set(updates)
    .where(eq(medicalCasesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  const action = body.data.status === "discharged" ? "تسجيل خروج" : "تعديل حالة";
  await logAction(action, "case", updated.id, updated.patientName, JSON.stringify(body.data));

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

  await logAction("حذف حالة", "case", deleted.id, deleted.patientName, "تم حذف الملف نهائياً");

  res.json({ success: true });
});

export default router;
