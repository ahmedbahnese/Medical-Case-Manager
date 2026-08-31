import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db,
  capaRecordsTable,
  ovrReportsTable,
  qualityAuditsTable,
  qualityIndicatorsTable,
  qualityInvestigationsTable,
  qualityNotificationsTable,
  qualityRisksTable,
  settingsTable,
} from "@workspace/db";
import { getCurrentUserName } from "../middleware/auth";
import { logAction } from "./audit-logs";

const router: IRouter = Router();
const QUALITY_MANAGER_SETTING = "quality_manager_names";
const OVR_STATUSES = ["New", "Under Review", "Investigation", "Corrective Action", "CAPA Required", "CAPA Not Required", "Verification", "Closed"];
const CAPA_STATUSES = ["Open", "In Progress", "Pending Verification", "Completed", "Closed", "Overdue"];

function parseJson(value: string | null | undefined): unknown[] {
  try { return JSON.parse(value ?? "[]"); } catch { return []; }
}

async function isQualityManager(name: string): Promise<boolean> {
  if (name === "المؤسس") return true;
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, QUALITY_MANAGER_SETTING));
  if (!row?.value) return false;
  try { return (JSON.parse(row.value) as string[]).includes(name); } catch { return false; }
}

async function requireQuality(req: any, res: any): Promise<string | null> {
  const user = getCurrentUserName(req.headers.cookie);
  if (!(await isQualityManager(user))) {
    res.status(403).json({ error: "هذه العملية تتطلب صلاحيات مسؤول الجودة أو المؤسس" });
    return null;
  }
  return user;
}

function nowPlusDays(days: number): Date { return new Date(Date.now() + days * 86400000); }

router.get("/quality/permissions", async (req, res): Promise<void> => {
  const user = getCurrentUserName(req.headers.cookie);
  res.json({ user, isFounder: user === "المؤسس", isQualityManager: await isQualityManager(user) });
});

router.get("/quality/ovr", async (req, res): Promise<void> => {
  const user = getCurrentUserName(req.headers.cookie);
  const privileged = await isQualityManager(user);
  const rows = privileged
    ? await db.select().from(ovrReportsTable).orderBy(desc(ovrReportsTable.createdAt))
    : await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.reporterName, user)).orderBy(desc(ovrReportsTable.createdAt));
  res.json(rows.map((row) => ({ ...row, attachments: parseJson(row.attachmentsJson) })));
});

router.get("/quality/ovr/:id", async (req, res): Promise<void> => {
  const user = getCurrentUserName(req.headers.cookie);
  const id = Number(req.params.id);
  const [row] = await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.id, id));
  if (!row) { res.status(404).json({ error: "بلاغ OVR غير موجود" }); return; }
  if (row.reporterName !== user && !(await isQualityManager(user))) { res.status(403).json({ error: "لا يمكن عرض بلاغات المستخدمين الآخرين" }); return; }
  const [investigation] = await db.select().from(qualityInvestigationsTable).where(eq(qualityInvestigationsTable.ovrId, id));
  res.json({ ...row, attachments: parseJson(row.attachmentsJson), investigation: investigation ?? null });
});

router.post("/quality/ovr", async (req, res): Promise<void> => {
  const user = getCurrentUserName(req.headers.cookie);
  const body = req.body as any;
  if (!body.eventDate || !body.location || !body.category || !body.eventType || !body.description) {
    res.status(400).json({ error: "التاريخ والمكان والتصنيف والنوع والوصف حقول مطلوبة" }); return;
  }
  const number = `OVR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const [created] = await db.insert(ovrReportsTable).values({
    ovrNumber: number, eventDate: new Date(body.eventDate), departmentId: body.departmentId ? Number(body.departmentId) : null,
    location: body.location, category: body.category, eventType: body.eventType, description: body.description,
    reporterName: user, reporterAccount: body.reporterAccount ?? user, patientRelated: Boolean(body.patientRelated),
    patientId: body.patientId ? Number(body.patientId) : null, patientName: body.patientName ?? null, hospitalNumber: body.hospitalNumber ?? null,
    attendingDoctor: body.attendingDoctor ?? null, nursingSupervisor: body.nursingSupervisor ?? null, administrativeManager: body.administrativeManager ?? null,
    impact: body.impact ?? "No Harm", immediateAction: body.immediateAction ?? null, correctiveAction: body.correctiveAction ?? null,
    actionOwner: body.actionOwner ?? null, attachmentsJson: JSON.stringify(body.attachments ?? []), notes: body.notes ?? null,
  }).returning();
  const [managers] = await db.select().from(settingsTable).where(eq(settingsTable.key, QUALITY_MANAGER_SETTING));
  const recipients = ["المؤسس"];
  try { recipients.push(...((JSON.parse(managers?.value ?? "[]") as string[]))); } catch {}
  for (const recipient of [...new Set(recipients)]) await db.insert(qualityNotificationsTable).values({ recipient, type: "OVR_CREATED", message: `بلاغ جديد ${number} يحتاج إلى المراجعة`, entityType: "ovr", entityId: created.id });
  if (["Significant", "Sentinel"].includes(created.impact)) {
    for (const recipient of [...new Set(recipients)]) await db.insert(qualityNotificationsTable).values({ recipient, type: "HIGH_IMPACT_OVR", message: `${created.impact} في البلاغ ${number}`, entityType: "ovr", entityId: created.id });
  }
  await logAction("إنشاء OVR", "ovr", created.id, number, null, user);
  res.status(201).json({ ...created, attachments: parseJson(created.attachmentsJson) });
});

router.patch("/quality/ovr/:id", async (req, res): Promise<void> => {
  const user = await requireQuality(req, res); if (!user) return;
  const id = Number(req.params.id); const [existing] = await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.id, id));
  if (!existing) { res.status(404).json({ error: "بلاغ OVR غير موجود" }); return; }
  const body = req.body as any;
  if (body.status && !OVR_STATUSES.includes(body.status)) { res.status(400).json({ error: "حالة OVR غير صحيحة" }); return; }
  await db.update(ovrReportsTable).set({ ...body, patientRelated: body.patientRelated === undefined ? undefined : Boolean(body.patientRelated), attachmentsJson: body.attachments ? JSON.stringify(body.attachments) : undefined, updatedAt: new Date() } as any).where(eq(ovrReportsTable.id, id));
  const [updated] = await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.id, id));
  await logAction("تحديث OVR", "ovr", id, updated.ovrNumber, JSON.stringify({ status: body.status }), user);
  res.json({ ...updated, attachments: parseJson(updated.attachmentsJson) });
});

router.post("/quality/ovr/:id/investigation", async (req, res): Promise<void> => {
  const user = await requireQuality(req, res); if (!user) return;
  const ovrId = Number(req.params.id); const body = req.body as any;
  const [ovr] = await db.select().from(ovrReportsTable).where(eq(ovrReportsTable.id, ovrId));
  if (!ovr) { res.status(404).json({ error: "بلاغ OVR غير موجود" }); return; }
  const [existing] = await db.select().from(qualityInvestigationsTable).where(eq(qualityInvestigationsTable.ovrId, ovrId));
  let investigation;
  if (existing) {
    [investigation] = await db.update(qualityInvestigationsTable).set({ ...body, updatedAt: new Date() } as any).where(eq(qualityInvestigationsTable.id, existing.id)).returning();
  } else {
    [investigation] = await db.insert(qualityInvestigationsTable).values({ ovrId, contributingCauses: body.contributingCauses ?? null, rootCause: body.rootCause ?? null, findings: body.findings ?? null, recommendations: body.recommendations ?? null, investigatedBy: user }).returning();
  }
  await db.update(ovrReportsTable).set({ status: "Investigation", updatedAt: new Date() }).where(eq(ovrReportsTable.id, ovrId));
  await logAction("إضافة تحقيق OVR", "ovr", ovrId, ovr.ovrNumber, null, user);
  res.json(investigation);
});

router.get("/quality/capa", async (req, res): Promise<void> => {
  const user = await requireQuality(req, res); if (!user) return;
  const rows = await db.select().from(capaRecordsTable).orderBy(desc(capaRecordsTable.createdAt));
  const today = Date.now();
  res.json(rows.map((row) => ({ ...row, evidence: parseJson(row.evidenceJson), computedStatus: row.dueDate && row.dueDate.getTime() < today && row.status !== "Closed" ? "Overdue" : row.status })));
});

router.post("/quality/capa", async (req, res): Promise<void> => {
  const user = await requireQuality(req, res); if (!user) return;
  const body = req.body as any;
  if (!body.problemFinding || !body.correctiveAction || !body.responsiblePerson) { res.status(400).json({ error: "المشكلة والإجراء التصحيحي والمسؤول حقول مطلوبة" }); return; }
  const capaNumber = `CAPA-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const [created] = await db.insert(capaRecordsTable).values({ capaNumber, ovrId: body.ovrId ? Number(body.ovrId) : null, departmentId: body.departmentId ? Number(body.departmentId) : null, problemFinding: body.problemFinding, rootCause: body.rootCause ?? null, correctiveAction: body.correctiveAction, preventiveAction: body.preventiveAction ?? null, responsiblePerson: body.responsiblePerson, dueDate: body.dueDate ? new Date(body.dueDate) : nowPlusDays(30), priority: body.priority ?? "Medium", evidenceJson: JSON.stringify(body.evidence ?? []) }).returning();
  await db.insert(qualityNotificationsTable).values({ recipient: "المؤسس", type: "CAPA_CREATED", message: `تم إنشاء ${capaNumber}`, entityType: "capa", entityId: created.id });
  await logAction("إنشاء CAPA", "capa", created.id, capaNumber, null, user);
  res.status(201).json({ ...created, evidence: parseJson(created.evidenceJson) });
});

router.patch("/quality/capa/:id", async (req, res): Promise<void> => {
  const user = await requireQuality(req, res); if (!user) return;
  const id = Number(req.params.id); const body = req.body as any;
  if (body.status && !CAPA_STATUSES.includes(body.status)) { res.status(400).json({ error: "حالة CAPA غير صحيحة" }); return; }
  const [existing] = await db.select().from(capaRecordsTable).where(eq(capaRecordsTable.id, id));
  if (!existing) { res.status(404).json({ error: "CAPA غير موجود" }); return; }
  const updates: any = { ...body, evidenceJson: body.evidence ? JSON.stringify(body.evidence) : undefined, dueDate: body.dueDate ? new Date(body.dueDate) : undefined, updatedAt: new Date() };
  if (body.status === "Closed") { updates.closureDate = new Date(); updates.closedBy = user; }
  await db.update(capaRecordsTable).set(updates).where(eq(capaRecordsTable.id, id));
  const [updated] = await db.select().from(capaRecordsTable).where(eq(capaRecordsTable.id, id));
  await logAction("تحديث CAPA", "capa", id, updated.capaNumber, JSON.stringify({ status: body.status }), user);
  res.json({ ...updated, evidence: parseJson(updated.evidenceJson) });
});

router.get("/quality/risks", async (req, res): Promise<void> => { const user = await requireQuality(req, res); if (!user) return; res.json(await db.select().from(qualityRisksTable).orderBy(desc(qualityRisksTable.createdAt))); });
router.post("/quality/risks", async (req, res): Promise<void> => { const user = await requireQuality(req, res); if (!user) return; const body = req.body as any; const score = Number(body.probability ?? 1) * Number(body.impact ?? 1); const level = score >= 12 ? "High" : score >= 6 ? "Medium" : "Low"; const [row] = await db.insert(qualityRisksTable).values({ ...body, departmentId: body.departmentId ? Number(body.departmentId) : null, probability: Number(body.probability ?? 1), impact: Number(body.impact ?? 1), riskLevel: level, dueDate: body.dueDate ? new Date(body.dueDate) : null }).returning(); await logAction("إضافة خطر جودة", "risk", row.id, row.risk, null, user); res.status(201).json(row); });
router.get("/quality/audits", async (req, res): Promise<void> => { const user = await requireQuality(req, res); if (!user) return; res.json(await db.select().from(qualityAuditsTable).orderBy(desc(qualityAuditsTable.auditDate))); });
router.post("/quality/audits", async (req, res): Promise<void> => { const user = await requireQuality(req, res); if (!user) return; const body = req.body as any; if (!body.name || !body.auditDate) { res.status(400).json({ error: "اسم التدقيق والتاريخ مطلوبان" }); return; } const [row] = await db.insert(qualityAuditsTable).values({ ...body, departmentId: body.departmentId ? Number(body.departmentId) : null, auditDate: new Date(body.auditDate) }).returning(); await logAction("إضافة تدقيق جودة", "audit", row.id, row.name, null, user); res.status(201).json(row); });
router.get("/quality/notifications", async (req, res): Promise<void> => { const user = getCurrentUserName(req.headers.cookie); const rows = await db.select().from(qualityNotificationsTable).where(eq(qualityNotificationsTable.recipient, user)).orderBy(desc(qualityNotificationsTable.createdAt)); res.json(rows); });

router.get("/quality/dashboard", async (req, res): Promise<void> => {
  const user = await requireQuality(req, res); if (!user) return;
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const where = and(gte(ovrReportsTable.eventDate, from), lte(ovrReportsTable.eventDate, to));
  const [total] = await db.select({ value: sql<number>`count(*)` }).from(ovrReportsTable).where(where);
  const [nearMiss] = await db.select({ value: sql<number>`count(*)` }).from(ovrReportsTable).where(and(where, eq(ovrReportsTable.impact, "Near Miss")));
  const [significant] = await db.select({ value: sql<number>`count(*)` }).from(ovrReportsTable).where(and(where, eq(ovrReportsTable.impact, "Significant")));
  const [sentinel] = await db.select({ value: sql<number>`count(*)` }).from(ovrReportsTable).where(and(where, eq(ovrReportsTable.impact, "Sentinel")));
  const [openCapa] = await db.select({ value: sql<number>`count(*)` }).from(capaRecordsTable).where(sql`${capaRecordsTable.status} != 'Closed'`);
  const [overdueCapa] = await db.select({ value: sql<number>`count(*)` }).from(capaRecordsTable).where(and(sql`${capaRecordsTable.status} != 'Closed'`, lte(capaRecordsTable.dueDate, new Date())));
  const byCategory = await db.select({ label: ovrReportsTable.category, value: sql<number>`count(*)` }).from(ovrReportsTable).where(where).groupBy(ovrReportsTable.category);
  const byDepartment = await db.select({ label: ovrReportsTable.departmentId, value: sql<number>`count(*)` }).from(ovrReportsTable).where(where).groupBy(ovrReportsTable.departmentId);
  res.json({ period: { from, to }, kpis: { totalOvr: Number(total?.value ?? 0), nearMiss: Number(nearMiss?.value ?? 0), significant: Number(significant?.value ?? 0), sentinel: Number(sentinel?.value ?? 0), openCapa: Number(openCapa?.value ?? 0), overdueCapa: Number(overdueCapa?.value ?? 0) }, byCategory, byDepartment });
});

export default router;
