import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, waitingCasesTable } from "@workspace/db";
import {
  GetWaitingCasesQueryParams,
  CreateWaitingCaseBody,
  UpdateWaitingCaseParams,
  UpdateWaitingCaseBody,
  DeleteWaitingCaseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/waiting-cases", async (req, res): Promise<void> => {
  const query = GetWaitingCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (query.data.section != null) {
    conditions.push(eq(waitingCasesTable.section, query.data.section as any));
  }
  if (query.data.status != null) {
    conditions.push(eq(waitingCasesTable.status, query.data.status as any));
  }

  const cases = await db
    .select()
    .from(waitingCasesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(waitingCasesTable.createdAt);

  res.json(cases);
});

router.post("/waiting-cases", async (req, res): Promise<void> => {
  const parsed = CreateWaitingCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [newCase] = await db.insert(waitingCasesTable).values({
    patientName: parsed.data.patientName,
    age: parsed.data.age ?? null,
    diagnosis: parsed.data.diagnosis ?? null,
    parentPhone: parsed.data.parentPhone ?? null,
    nationalId: parsed.data.nationalId ?? null,
    careType: parsed.data.careType as any,
    centralRoomRequired: parsed.data.centralRoomRequired ?? false,
    centralRoomCode: parsed.data.centralRoomCode ?? null,
    artificialRespiration: (parsed.data.artificialRespiration as any) ?? "no",
    section: (parsed.data.section as any) ?? "reception",
    status: "waiting",
  }).returning();

  res.status(201).json(newCase);
});

router.patch("/waiting-cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateWaitingCaseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateWaitingCaseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = { ...body.data, updatedAt: new Date() };

  const [updated] = await db
    .update(waitingCasesTable)
    .set(updates)
    .where(eq(waitingCasesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  res.json(updated);
});

router.delete("/waiting-cases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWaitingCaseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(waitingCasesTable)
    .where(eq(waitingCasesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "الحالة غير موجودة" });
    return;
  }

  res.json({ success: true });
});

export default router;
