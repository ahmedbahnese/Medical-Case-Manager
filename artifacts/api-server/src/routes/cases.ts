import { Router, type IRouter } from "express";
import multer from "multer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createWorker } from "tesseract.js";
import { eq, and, like, ne, SQL } from "drizzle-orm";
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
import { getCurrentUserName, requireFounder } from "../middleware/auth";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const execFileAsync = promisify(execFile);
const localRequire = createRequire(import.meta.url);
const arabicOcrData = localRequire("@tesseract.js-data/ara") as { langPath: string };
let embeddedOcrWorker: Promise<any> | null = null;

async function runEmbeddedArabicOcr(image: Buffer): Promise<string> {
  if (!embeddedOcrWorker) {
    embeddedOcrWorker = createWorker("ara", 1, {
      langPath: arabicOcrData.langPath,
      cachePath: path.join(process.env.BSCH_DATA_DIR ?? os.tmpdir(), "tesseract-cache"),
      gzip: true,
      logger: () => undefined,
    });
  }
  const worker = await embeddedOcrWorker;
  const result = await worker.recognize(image);
  return result.data.text ?? "";
}

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
  // MySQL LIKE is case-insensitive by default (utf8mb4_unicode_ci)
  if (query.data.patientName) {
    conditions.push(like(medicalCasesTable.patientName, `%${query.data.patientName}%`));
  }
  if (query.data.nationalId) {
    conditions.push(like(medicalCasesTable.nationalId, `%${query.data.nationalId}%`));
  }
  if (query.data.fileNumber) {
    conditions.push(like(medicalCasesTable.fileNumber, `%${query.data.fileNumber}%`));
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
  const normalizedName = parsed.data.patientName.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const existingNames = await db.select({ patientName: medicalCasesTable.patientName }).from(medicalCasesTable);
  if (existingNames.some(c => c.patientName.trim().replace(/\s+/g, " ").toLocaleLowerCase() === normalizedName)) {
    res.status(409).json({ error: "يوجد حالة بنفس الاسم" });
    return;
  }

  const {
    patientName, departmentId, age, diagnosis, symptoms, treatment, notes,
    parentName, parentPhone, nationalId, fileNumber, caseType, artificialRespiration, status
  } = parsed.data;

  const extraData = req.body as any;

  const [{ id: newCaseId }] = await db.insert(medicalCasesTable).values({
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
  }).returning({ id: medicalCasesTable.id });

  const [newCase] = await db.select().from(medicalCasesTable).where(eq(medicalCasesTable.id, newCaseId));

  await logAction("إضافة حالة", "case", newCase.id, patientName, `تم إضافة حالة جديدة للقسم رقم ${departmentId}`, getCurrentUserName(req.headers.cookie));

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
        parentName: c.parentName,
        parentPhone: c.parentPhone,
        nationalId: c.nationalId,
        fileNumber: c.fileNumber,
        artificialRespiration: (c.artificialRespiration as any) ?? "no",
        caseType: "intensive_care_high",
        status: "active",
      });
      importedCount++;
    } catch (_) { /* skip invalid */ }
  }

  res.json({ parsed: parsedCases, imported: importedCount });
});

// Local extraction endpoint: never saves data; it only returns editable suggestions.
router.post("/cases/extract", upload.single("file"), async (req, res): Promise<void> => {
  let sourceText = typeof req.body?.text === "string" ? req.body.text : "";
  const file = req.file;
  if (file) {
    if (file.mimetype.startsWith("text/")) {
      sourceText = file.buffer.toString("utf8");
    } else if (file.mimetype === "application/pdf") {
      // Text PDFs can be extracted by pdftotext when installed locally.
      const tempFile = path.join(os.tmpdir(), `bsch-${Date.now()}.pdf`);
      try {
        await fs.writeFile(tempFile, file.buffer);
        const result = await execFileAsync(process.env.PDFTOTEXT_CMD ?? "pdftotext", [tempFile, "-"]);
        sourceText = result.stdout;
      } catch {
        res.status(422).json({ error: "تعذر قراءة ملف PDF. ثبّت pdftotext محليًا أو أرسل صورة للصفحة." });
        return;
      } finally {
        await fs.rm(tempFile, { force: true }).catch(() => undefined);
      }
    } else {
      const tempFile = path.join(os.tmpdir(), `bsch-${Date.now()}`);
      try {
        await fs.writeFile(tempFile, file.buffer);
        try {
          const result = await execFileAsync(process.env.TESSERACT_CMD ?? "tesseract", [tempFile, "stdout", "-l", process.env.TESSERACT_LANG ?? "ara+eng", "--psm", "6"], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
          sourceText = result.stdout;
        } catch {
          // Portable fallback: bundled Tesseract.js runs fully offline.
          sourceText = await runEmbeddedArabicOcr(file.buffer);
        }
      } catch {
        res.status(422).json({ error: "تعذر تشغيل OCR المحلي المدمج. أعد تشغيل الخادم وحاول بصورة أوضح." });
        return;
      } finally {
        await fs.rm(tempFile, { force: true }).catch(() => undefined);
      }
    }
  }
  if (!sourceText.trim()) {
    res.status(400).json({ error: "أرسل نصًا أو صورة أو ملف PDF للتحليل." });
    return;
  }
  const departmentId = req.body?.departmentId ? Number(req.body.departmentId) : null;
  res.json({ source: file ? file.originalname : "text", text: sourceText, parsed: parseArabicCasesText(sourceText, departmentId) });
});

export function parseArabicCasesText(text: string, defaultDeptId: number | null | undefined) {
  type ParsedCase = {
    patientName: string;
    parentName: string | null;
    fileNumber: string | null;
    age: string | null;
    diagnosis: string | null;
    parentPhone: string | null;
    nationalId: string | null;
    notes: string | null;
    artificialRespiration: string | null;
    departmentId: number | null;
  };

  const results: ParsedCase[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let currentCase: ParsedCase | null = null;

  const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const cleanValue = (value: string) => value.replace(/^\s*[*:：\-]+\s*/, "").trim();
  const extractValue = (line: string, labels: string[]) => {
    const pattern = new RegExp(`^\\s*(?:${labels.join("|")})\\s*[\\s*:_：\\-]*\\s*(.*?)\\s*$`, "i");
    const match = line.match(pattern);
    return match ? cleanValue(match[1]) : null;
  };
  const isFileNumber = (line: string) => /^\s*[0-9٠-٩]{5,10}\s*$/.test(line);
  const nameValue = (line: string) => extractValue(line, ["الاسم", "الإسم", "اسم الحالة", "اسم المريض", "الحالة", "المريض"]);
  const ageValue = (line: string) => extractValue(line, ["السن", "سن", "العمر", "عمره", "عمرها", "age"]);
  const diagnosisValue = (line: string) => extractValue(line, ["التشخيص", "تشخيص", "مرض", "dx", "diagnosis"]);
  const nationalIdValue = (line: string) => extractValue(line, ["الرقم القومي", "رقم قومي", "القومي", "قومي", "الهوية", "هوية"]);
  const phoneValue = (line: string) => extractValue(line, ["رقم الأهل", "رقم الاهل", "هاتف", "تليفون", "موبايل", "تلفون", "phone"]);

  const makeCase = (fileNumber: string | null = null): ParsedCase => ({
    patientName: "",
    parentName: null,
    fileNumber: fileNumber ? normalizeDigits(fileNumber) : null,
    age: null,
    diagnosis: null,
    parentPhone: null,
    nationalId: null,
    notes: null,
    artificialRespiration: null,
    departmentId: defaultDeptId ?? null,
  });

  const setPatientName = (target: ParsedCase, value: string) => {
    const patientName = cleanValue(value).replace(/^[*-]+\s*/, "").trim();
    if (!patientName) return;
    target.patientName = patientName;
    const guardian = patientName.match(/^(?:ابن|ابنة|بنت)\s+(.+)$/i);
    if (guardian) target.parentName = guardian[1].trim();
  };

  const finishCurrent = () => {
    if (currentCase && currentCase.patientName.trim()) results.push(currentCase);
  };

  for (const line of lines) {
    if (isFileNumber(line)) {
      finishCurrent();
      currentCase = makeCase(line);
      continue;
    }

    const parsedName = nameValue(line);
    if (parsedName) {
      if (!currentCase) currentCase = makeCase();
      setPatientName(currentCase, parsedName);
      continue;
    }

    if (!currentCase) continue;

    const parsedAge = ageValue(line);
    if (parsedAge && !currentCase.age) currentCase.age = parsedAge;

    const parsedDiagnosis = diagnosisValue(line);
    if (parsedDiagnosis && !currentCase.diagnosis) currentCase.diagnosis = parsedDiagnosis;

    const parsedNationalId = nationalIdValue(line);
    if (parsedNationalId && !currentCase.nationalId) {
      const digits = normalizeDigits(parsedNationalId).replace(/\D/g, "");
      if (digits.length >= 10) currentCase.nationalId = digits;
    }

    const parsedPhone = phoneValue(line);
    if (parsedPhone && !currentCase.parentPhone) {
      const digits = normalizeDigits(parsedPhone).replace(/[^0-9+]/g, "");
      if (digits.length >= 8) currentCase.parentPhone = digits;
    } else if (!currentCase.parentPhone) {
      const phone = normalizeDigits(line).match(/\b01[0-9]{9}\b/);
      if (phone) currentCase.parentPhone = phone[0];
    }

    const serviceText = line.toLowerCase();
    if (/(?:تنفس صناعي|جهاز تنفس|فنت|تهوية آلية|\bvent\b|\bmv\b|\bpcv\b)/i.test(serviceText)) {
      if (/(?:تردد عالي|عالي التردد|hfo|hfov)/i.test(serviceText)) currentCase.artificialRespiration = "high_frequency";
      else if (/(?:hfnc)/i.test(serviceText)) currentCase.artificialRespiration = "hfnc";
      else if (/(?:cpap|سباب|سي باب)/i.test(serviceText)) currentCase.artificialRespiration = "cpap";
      else currentCase.artificialRespiration = "vent";
    }
  }

  finishCurrent();

  if (results.length === 0 && text.trim()) {
    const firstLine = lines[0] ?? text.trim();
    const fallback = makeCase();
    setPatientName(fallback, firstLine);
    fallback.notes = text.trim();
    results.push(fallback);
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

  // Verify the case exists before updating
  const [existing] = await db
    .select({ id: medicalCasesTable.id, patientName: medicalCasesTable.patientName })
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  const extraData = req.body as any;
  const data = body.data as any;
  if (data.patientName !== undefined) {
    const normalizedName = data.patientName.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const names = await db.select({ id: medicalCasesTable.id, patientName: medicalCasesTable.patientName }).from(medicalCasesTable);
    if (names.some(c => c.id !== params.data.id && c.patientName.trim().replace(/\s+/g, " ").toLocaleLowerCase() === normalizedName)) {
      res.status(409).json({ error: "يوجد حالة بنفس الاسم" });
      return;
    }
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const textFields = ["patientName", "age", "diagnosis", "symptoms", "treatment", "notes", "parentName", "parentPhone", "nationalId", "fileNumber", "caseType", "mobe"];
  for (const field of textFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates[field] = data[field] === "" ? null : data[field];
    }
  }
  for (const field of ["departmentId", "artificialRespiration", "status"]) {
    if (Object.prototype.hasOwnProperty.call(data, field)) updates[field] = data[field];
  }
  for (const field of ["admissionDate", "ventilationStartDate", "ventilationEndDate", "dischargeDate"]) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const value = data[field];
      updates[field] = value ? new Date(value) : null;
    }
  }
  for (const field of ["dischargeReason", "transferDestination"]) {
    if (Object.prototype.hasOwnProperty.call(data, field)) updates[field] = data[field] || null;
  }

  if (data.status === "discharged") {
    const allowedReasons = ["improved", "request", "transferred", "death", "internal_transfer"];
    if (!allowedReasons.includes(data.dischargeReason ?? extraData.dischargeReason)) {
      res.status(400).json({ error: "سبب الخروج مطلوب ويجب أن يكون صحيحاً" });
      return;
    }
  }

  if (body.data.status === "discharged" && !extraData.dischargeDate) {
    updates.dischargeDate = new Date();
  } else if (extraData.dischargeDate !== undefined) {
    updates.dischargeDate = extraData.dischargeDate ? new Date(extraData.dischargeDate) : null;
  }

  // MySQL does not support .returning() — update then re-select
  await db
    .update(medicalCasesTable)
    .set(updates)
    .where(eq(medicalCasesTable.id, params.data.id));

  const [updated] = await db
    .select()
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.id, params.data.id));

  const action = body.data.status === "discharged" ? "تسجيل خروج" : "تعديل حالة";
  await logAction(action, "case", updated.id, updated.patientName, JSON.stringify(body.data), getCurrentUserName(req.headers.cookie));

  const enriched = await enrichCaseWithDepartment(updated);
  res.json(enriched);
});

router.delete("/cases/:id", requireFounder, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCaseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // MySQL does not support .returning() — select first, then delete
  const [toDelete] = await db
    .select()
    .from(medicalCasesTable)
    .where(eq(medicalCasesTable.id, params.data.id));

  if (!toDelete) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  await db.delete(medicalCasesTable).where(eq(medicalCasesTable.id, params.data.id));

  await logAction("حذف حالة", "case", toDelete.id, toDelete.patientName, "تم حذف الملف نهائياً", getCurrentUserName(req.headers.cookie));

  res.json({ success: true });
});

export default router;
