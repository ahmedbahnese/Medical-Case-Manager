import { Router, type IRouter } from "express";
import { desc, lt, sql } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { getCurrentUserName } from "../middleware/auth";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  await db.delete(auditLogsTable).where(
    lt(auditLogsTable.createdAt, sql`(strftime('%s', 'now') * 1000) - (30 * 24 * 60 * 60 * 1000)`),
  );
  const limit = parseInt((req.query.limit as string) ?? "100", 10);
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(Math.min(limit, 500));
  res.json(logs);
});

router.delete("/audit-logs", async (_req, res): Promise<void> => {
  await db.delete(auditLogsTable);
  res.json({ success: true });
});

export async function logAction(
  action: string,
  entityType: string,
  entityId: number | null,
  entityName: string | null,
  details: string | null,
  performedBy?: string
) {
  try {
    await db.insert(auditLogsTable).values({
      action,
      entityType,
      entityId,
      entityName,
      details,
      performedBy: performedBy ?? "مستخدم النظام",
    });
  } catch { /* non-critical, don't fail the main operation */ }
}

export default router;
