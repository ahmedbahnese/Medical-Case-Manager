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

export default router;
