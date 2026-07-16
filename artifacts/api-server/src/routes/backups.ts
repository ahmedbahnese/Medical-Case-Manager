import { Router, type IRouter } from "express";
import { db, backupsTable, medicalCasesTable, waitingCasesTable } from "@workspace/db";
import { CreateBackupBody } from "@workspace/api-zod";
import { count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/backups", async (req, res): Promise<void> => {
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

  // Collect all current data for backup
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

export default router;
