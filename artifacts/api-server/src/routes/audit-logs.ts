import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "100", 10);
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(Math.min(limit, 500));
  res.json(logs);
});

export async function logAction(
  action: string,
  entityType: string,
  entityId: number | null,
  entityName: string | null,
  details: string | null,
  performedBy = "المستخدم"
) {
  try {
    await db.insert(auditLogsTable).values({
      action,
      entityType,
      entityId,
      entityName,
      details,
      performedBy,
    });
  } catch { /* non-critical, don't fail the main operation */ }
}

export default router;
