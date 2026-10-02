import { Router } from "express";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, auditLogsTable, outpatientAppointmentsTable, outpatientBookingRequestsTable, outpatientClinicDoctorsTable, outpatientClinicExceptionsTable, outpatientClinicsTable, outpatientMessageDeliveriesTable, outpatientMessageTemplatesTable, outpatientServicesTable } from "@workspace/db";
import { getCurrentUserName, requireFounder, requirePageAccess, requireOutpatientRole } from "../middleware/auth";
import { sendAssessmentToConfiguredChannels } from "./messaging";

const router = Router();
const PAGE = "/outpatient-clinics";
const TEMPLATE_NAMES: Record<string, string> = { welcome: "الترحيب", missing_data: "البيانات الناقصة", booking_confirmed: "تأكيد الحجز", cancelled: "الإلغاء", rescheduled: "تعديل / إعادة الجدولة", clinic_unavailable: "عدم توفر العيادة", queue_followup: "متابعة رقم الانتظار", attendance_instructions: "تعليمات الحضور" };
const DEFAULT_TEMPLATES: Record<string, string> = {
  welcome: "أهلًا {{patientName}}، مرحبًا بكم في {{hospitalName}}. كيف يمكننا مساعدتكم؟",
  missing_data: "نحتاج لاستكمال البيانات التالية: {{missingFields}} لإتمام طلب حجز {{clinicName}}.",
  booking_confirmed: "تم تأكيد حجز {{patientName}} بعيادة {{clinicName}} يوم {{appointmentDate}} من {{workingHours}}، رقم الانتظار {{queueNumber}}. المتابعة: {{trackingLink}}",
  cancelled: "تم إلغاء حجز {{patientName}} بعيادة {{clinicName}}.",
  rescheduled: "تم تعديل حجز {{patientName}} بعيادة {{clinicName}} إلى يوم {{appointmentDate}}.",
  clinic_unavailable: "نعتذر، عيادة {{clinicName}} غير متاحة في {{appointmentDate}}.",
  queue_followup: "رقمك الحالي {{queueNumber}} في {{clinicName}}. تابع الدور: {{trackingLink}}",
  attendance_instructions: "يرجى الحضور إلى {{clinicName}} قبل الموعد بوقت كافٍ ومعك المستندات المطلوبة.",
};
function clean(value: unknown) { return String(value ?? "").trim(); }
function templateText(body: string, values: Record<string, unknown>) { return body.replace(/{{(\w+)}}/g, (_, key) => clean(values[key]) || `{{${key}}}`); }
async function audit(req: any, action: string, entityId: number | null, entityName: string, details?: unknown) { await db.insert(auditLogsTable).values({ action, entityType: "outpatient", entityId, entityName, details: details ? JSON.stringify(details) : null, performedBy: getCurrentUserName(req.headers.cookie) }); }

router.get("/outpatient/templates", requirePageAccess(PAGE), async (_req, res) => {
  const rows = await db.select().from(outpatientMessageTemplatesTable).orderBy(asc(outpatientMessageTemplatesTable.id));
  const byKey = new Map(rows.map(row => [row.templateKey, row]));
  res.json(Object.keys(TEMPLATE_NAMES).map(templateKey => byKey.get(templateKey) ?? { id: null, templateKey, name: TEMPLATE_NAMES[templateKey], body: DEFAULT_TEMPLATES[templateKey], enabled: true }));
});
router.post("/outpatient/templates/:key", requireFounder, async (req, res) => {
  const key = String(req.params.key); if (!TEMPLATE_NAMES[key]) { res.status(400).json({ error: "نوع القالب غير صالح" }); return; }
  const body = clean(req.body?.body); if (!body) { res.status(400).json({ error: "نص القالب مطلوب" }); return; }
  await db.insert(outpatientMessageTemplatesTable).values({ templateKey: key, name: TEMPLATE_NAMES[key], body, enabled: req.body?.enabled !== false, updatedBy: getCurrentUserName(req.headers.cookie), updatedAt: new Date() }).onConflictDoUpdate({ target: outpatientMessageTemplatesTable.templateKey, set: { body, enabled: req.body?.enabled !== false, updatedBy: getCurrentUserName(req.headers.cookie), updatedAt: new Date() } });
  await audit(req, "تعديل قالب رسالة", null, TEMPLATE_NAMES[key], { key }); res.json({ success: true });
});
router.post("/outpatient/templates/preview", requirePageAccess(PAGE, "view"), async (req, res) => { res.json({ text: templateText(clean(req.body?.body), req.body?.values ?? {}) }); });

router.get("/outpatient/clinics/:clinicId/services", requirePageAccess(PAGE), async (req, res) => { res.json(await db.select().from(outpatientServicesTable).where(eq(outpatientServicesTable.clinicId, Number(req.params.clinicId))).orderBy(asc(outpatientServicesTable.name))); });
router.post("/outpatient/clinics/:clinicId/services", requireOutpatientRole(["reception"]), async (req, res) => { const clinicId = Number(req.params.clinicId); const [row] = await db.insert(outpatientServicesTable).values({ clinicId, name: clean(req.body?.name), durationMinutes: Math.max(5, Number(req.body?.durationMinutes) || 15), capacityPerHour: Math.max(1, Number(req.body?.capacityPerHour) || 4), workingDays: JSON.stringify(req.body?.workingDays ?? []), workStart: clean(req.body?.workStart) || "09:00", workEnd: clean(req.body?.workEnd) || "14:00", active: req.body?.active !== false }).returning(); await audit(req, "إضافة خدمة عيادة", row.id, row.name); res.status(201).json(row); });
router.patch("/outpatient/services/:id", requireOutpatientRole(["reception"]), async (req, res) => { const id = Number(req.params.id); await db.update(outpatientServicesTable).set({ name: clean(req.body?.name), durationMinutes: Math.max(5, Number(req.body?.durationMinutes) || 15), capacityPerHour: Math.max(1, Number(req.body?.capacityPerHour) || 4), workingDays: JSON.stringify(req.body?.workingDays ?? []), workStart: clean(req.body?.workStart) || "09:00", workEnd: clean(req.body?.workEnd) || "14:00", active: req.body?.active !== false, updatedAt: new Date() }).where(eq(outpatientServicesTable.id, id)); const [row] = await db.select().from(outpatientServicesTable).where(eq(outpatientServicesTable.id, id)); res.json(row); });
router.delete("/outpatient/services/:id", requireOutpatientRole(["reception"]), async (req, res) => { await db.delete(outpatientServicesTable).where(eq(outpatientServicesTable.id, Number(req.params.id))); res.json({ success: true }); });

router.get("/outpatient/clinics/:clinicId/exceptions", requirePageAccess(PAGE), async (req, res) => { res.json(await db.select().from(outpatientClinicExceptionsTable).where(eq(outpatientClinicExceptionsTable.clinicId, Number(req.params.clinicId))).orderBy(desc(outpatientClinicExceptionsTable.exceptionDate))); });
router.post("/outpatient/clinics/:clinicId/exceptions", requireOutpatientRole(["reception"]), async (req, res) => { const [row] = await db.insert(outpatientClinicExceptionsTable).values({ clinicId: Number(req.params.clinicId), exceptionDate: clean(req.body?.exceptionDate), kind: clean(req.body?.kind) || "closed", reason: clean(req.body?.reason) || null, doctorName: clean(req.body?.doctorName) || null, workStart: clean(req.body?.workStart) || null, workEnd: clean(req.body?.workEnd) || null, createdBy: getCurrentUserName(req.headers.cookie) }).returning(); await audit(req, "إضافة استثناء لجدول العيادة", row.id, row.exceptionDate); res.status(201).json(row); });
router.delete("/outpatient/exceptions/:id", requireOutpatientRole(["reception"]), async (req, res) => { await db.delete(outpatientClinicExceptionsTable).where(eq(outpatientClinicExceptionsTable.id, Number(req.params.id))); res.json({ success: true }); });
router.get("/outpatient/clinics/:clinicId/doctors", requirePageAccess(PAGE), async (req, res) => { res.json(await db.select().from(outpatientClinicDoctorsTable).where(eq(outpatientClinicDoctorsTable.clinicId, Number(req.params.clinicId))).orderBy(asc(outpatientClinicDoctorsTable.doctorName))); });
router.post("/outpatient/clinics/:clinicId/doctors", requireOutpatientRole(["reception"]), async (req, res) => { const [row] = await db.insert(outpatientClinicDoctorsTable).values({ clinicId: Number(req.params.clinicId), doctorName: clean(req.body?.doctorName), active: true }).returning(); res.status(201).json(row); });
router.delete("/outpatient/doctors/:id", requireOutpatientRole(["reception"]), async (req, res) => { await db.delete(outpatientClinicDoctorsTable).where(eq(outpatientClinicDoctorsTable.id, Number(req.params.id))); res.json({ success: true }); });

router.get("/outpatient/reports", requirePageAccess(PAGE), async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(clean(req.query.date)) ? clean(req.query.date) : new Date().toISOString().slice(0, 10);
  const conditions: any[] = [eq(outpatientAppointmentsTable.appointmentDate, date)];
  if (req.query.clinicId && req.query.clinicId !== "all") conditions.push(eq(outpatientAppointmentsTable.clinicId, Number(req.query.clinicId)));
  if (req.query.status && req.query.status !== "all") conditions.push(eq(outpatientAppointmentsTable.status, clean(req.query.status)));
  if (req.query.source && req.query.source !== "all") conditions.push(eq(outpatientAppointmentsTable.source, clean(req.query.source)));
  const appointments = await db.select().from(outpatientAppointmentsTable).where(and(...conditions)).orderBy(asc(outpatientAppointmentsTable.queueNumber));
  const clinics = await db.select().from(outpatientClinicsTable); const names = new Map(clinics.map(c => [c.id, c.name]));
  const counts: Record<string, number> = { total: appointments.length, waiting: 0, called: 0, in_service: 0, completed: 0, cancelled: 0, no_show: 0, skipped: 0, system: 0, external: 0, staff: 0 };
  for (const a of appointments) { counts[a.status] = (counts[a.status] ?? 0) + 1; counts[a.source] = (counts[a.source] ?? 0) + 1; }
  const waitSamples = appointments.filter(a => a.calledAt).map(a => Math.max(0, a.calledAt!.getTime() - a.createdAt.getTime()) / 60000);
  const averageWaitMinutes = waitSamples.length ? Math.round((waitSamples.reduce((sum, value) => sum + value, 0) / waitSamples.length) * 10) / 10 : 0;
  res.json({ date, counts, averageWaitMinutes, appointments: appointments.map(a => ({ ...a, clinicName: names.get(a.clinicId) ?? "—" })) });
});
router.get("/outpatient/message-deliveries", requirePageAccess(PAGE), async (_req, res) => { res.json(await db.select().from(outpatientMessageDeliveriesTable).orderBy(desc(outpatientMessageDeliveriesTable.createdAt)).limit(200)); });

function extractBooking(text: string, clinics: any[]) { const lower = text.toLocaleLowerCase(); const clinic = clinics.find(c => lower.includes(String(c.name).toLocaleLowerCase()) || (c.specialty && lower.includes(c.specialty.toLocaleLowerCase()))); const phone = text.match(/(?:01|\+?20\s?1)\d[\s-]?\d{8,}/)?.[0]?.replace(/[\s-]/g, ""); const age = text.match(/(?:العمر|السن)\s*[:：]?\s*(\d+)/)?.[1] ?? null; const name = text.match(/(?:الاسم|اسمي)\s*[:：]?\s*([^،,\n]+)/)?.[1]?.trim() ?? null; const day = text.match(/(الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)/)?.[1] ?? null; const extracted = { patientName: name, age, phone, clinicId: clinic?.id ?? null, clinicName: clinic?.name ?? null, requestedDay: day, serviceType: null }; const missingFields = Object.entries(extracted).filter(([key, value]) => ["patientName", "phone", "clinicId"].includes(key) && !value).map(([key]) => key); return { extracted, missingFields }; }
router.post("/outpatient/booking-requests/analyze", requirePageAccess(PAGE, "edit"), async (req, res) => { const text = clean(req.body?.text); const clinics = await db.select().from(outpatientClinicsTable); const result = extractBooking(text, clinics); const [row] = await db.insert(outpatientBookingRequestsTable).values({ channel: clean(req.body?.channel) || "staff", senderId: clean(req.body?.senderId) || null, rawText: text, extractedJson: JSON.stringify(result.extracted), missingFieldsJson: JSON.stringify(result.missingFields), status: result.missingFields.length ? "needs_data" : "needs_review" }).returning(); res.status(201).json({ ...row, ...result, aiAssisted: true, requiresHumanConfirmation: true }); });

export { templateText };
export default router;
