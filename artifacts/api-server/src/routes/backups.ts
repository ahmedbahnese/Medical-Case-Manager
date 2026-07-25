import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, backupsTable, medicalCasesTable, waitingCasesTable } from "@workspace/db";
import { CreateBackupBody } from "@workspace/api-zod";
import { count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/backups", async (_req, res): Promise<void> => {
  const backups = await db
    .select({
      id: backupsTable.id,
      backupName: backupsTable.backupName,
      recordCount: backupsTable.recordCount,
      createdAt: backupsTable.createdAt,
    })
    .from(backupsTable)
    .orderBy(backupsTable.createdAt);

  res.json(backups);
});

router.post("/backups", async (req, res): Promise<void> => {
  const parsed = CreateBackupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const cases = await db.select().from(medicalCasesTable);
  const waitingCases = await db.select().from(waitingCasesTable);

  const backupData = JSON.stringify({ cases, waitingCases, createdAt: new Date().toISOString() });
  const recordCount = cases.length + waitingCases.length;

  const [backup] = await db.insert(backupsTable).values({
    backupName: parsed.data.backupName,
    backupData,
    recordCount,
  }).returning({
    id: backupsTable.id,
    backupName: backupsTable.backupName,
    recordCount: backupsTable.recordCount,
    createdAt: backupsTable.createdAt,
  });

  res.status(201).json(backup);
});

// Download a backup as JSON
router.get("/backups/:id/download", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [backup] = await db.select().from(backupsTable).where(eq(backupsTable.id, id));
  if (!backup) {
    res.status(404).json({ error: "النسخة غير موجودة" });
    return;
  }
  const filename = `bsch-backup-${backup.backupName}-${backup.id}.json`.replace(/\s+/g, "_");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.send(backup.backupData);
});

// Delete a backup
router.delete("/backups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [deleted] = await db.delete(backupsTable).where(eq(backupsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "النسخة غير موجودة" });
    return;
  }
  res.json({ success: true });
});

function parseBackupData(value: unknown): { cases: any[]; waitingCases: any[] } {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object") throw new Error("صيغة النسخة غير صالحة");
  const data = parsed as any;
  if (!Array.isArray(data.cases) || !Array.isArray(data.waitingCases)) {
    throw new Error("النسخة يجب أن تحتوي على بيانات الحالات وقائمة الانتظار");
  }
  return { cases: data.cases, waitingCases: data.waitingCases };
}

router.post("/backups/import", async (req, res): Promise<void> => {
  try {
    const { backupName, backupData } = req.body as { backupName?: string; backupData?: unknown };
    const data = parseBackupData(backupData);
    const [backup] = await db.insert(backupsTable).values({
      backupName: String(backupName || "نسخة مستوردة").slice(0, 120),
      backupData: JSON.stringify({ ...data, importedAt: new Date().toISOString() }),
      recordCount: data.cases.length + data.waitingCases.length,
    }).returning({
      id: backupsTable.id,
      backupName: backupsTable.backupName,
      recordCount: backupsTable.recordCount,
      createdAt: backupsTable.createdAt,
    });
    res.status(201).json(backup);
  } catch (error: any) {
    res.status(400).json({ error: error?.message ?? "ملف النسخة غير صالح" });
  }
});

router.post("/backups/:id/restore", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (!req.body?.confirm || !req.body?.replaceExisting) {
    res.status(400).json({ error: "يجب تأكيد استبدال البيانات الحالية صراحةً" });
    return;
  }
  const [backup] = await db.select().from(backupsTable).where(eq(backupsTable.id, id));
  if (!backup) {
    res.status(404).json({ error: "النسخة غير موجودة" });
    return;
  }
  try {
    const data = parseBackupData(backup.backupData);
    await db.transaction(async (tx) => {
      await tx.delete(medicalCasesTable);
      await tx.delete(waitingCasesTable);
      if (data.cases.length) {
        await tx.insert(medicalCasesTable).values(data.cases.map((item: any) => ({
          patientName: item.patientName,
          departmentId: Number(item.departmentId),
          age: item.age ?? null,
          diagnosis: item.diagnosis ?? null,
          symptoms: item.symptoms ?? null,
          treatment: item.treatment ?? null,
          notes: item.notes ?? null,
          parentName: item.parentName ?? null,
          parentPhone: item.parentPhone ?? null,
          nationalId: item.nationalId ?? null,
          fileNumber: item.fileNumber ?? null,
          caseType: item.caseType ?? "intensive_care_high",
          artificialRespiration: item.artificialRespiration ?? "no",
          status: item.status ?? "active",
          mobe: item.mobe ?? null,
          ventilationStartDate: item.ventilationStartDate ? new Date(item.ventilationStartDate) : null,
          ventilationEndDate: item.ventilationEndDate ? new Date(item.ventilationEndDate) : null,
          dischargeReason: item.dischargeReason ?? null,
          admissionDate: item.admissionDate ? new Date(item.admissionDate) : new Date(),
          dischargeDate: item.dischargeDate ? new Date(item.dischargeDate) : null,
        })) as any);
      }
      if (data.waitingCases.length) {
        await tx.insert(waitingCasesTable).values(data.waitingCases.map((item: any) => ({
          patientName: item.patientName,
          age: item.age ?? null,
          diagnosis: item.diagnosis ?? null,
          parentPhone: item.parentPhone ?? null,
          nationalId: item.nationalId ?? null,
          medicalReport: item.medicalReport ?? null,
          medicalReportName: item.medicalReportName ?? null,
          medicalReportData: item.medicalReportData ?? null,
          careType: item.careType ?? "intensive_care_high",
          centralRoomRequired: Boolean(item.centralRoomRequired),
          centralRoomCode: item.centralRoomCode ?? null,
          artificialRespiration: item.artificialRespiration ?? "no",
          section: item.section ?? "reception",
          status: item.status ?? "waiting",
        })) as any);
      }
    });
    res.json({ success: true, restoredCases: data.cases.length, restoredWaitingCases: data.waitingCases.length });
  } catch (error: any) {
    res.status(400).json({ error: error?.message ?? "تعذر استعادة النسخة" });
  }
});

export default router;
