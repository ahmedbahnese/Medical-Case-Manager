import { Router } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, outpatientAppointmentsTable, outpatientClinicsTable } from "@workspace/db";
import { requireAnyPageAccess, requireFounder, requirePageAccess, requireOutpatientRole } from "../middleware/auth";

const router = Router();
const PAGE = "/outpatient-clinics";
const VALID_SOURCES = new Set(["system", "external"]);
const VALID_STATUSES = new Set(["waiting", "called", "in_service", "completed", "cancelled"]);

function clinicPayload(body: any) {
  return {
    name: String(body.name ?? "").trim(),
    specialty: String(body.specialty ?? "").trim() || null,
    doctorName: String(body.doctorName ?? "").trim(),
    room: String(body.room ?? "").trim() || null,
    phone: String(body.phone ?? "").trim() || null,
    dailyCapacity: Math.max(1, Number(body.dailyCapacity) || 30),
    appointmentDuration: Math.max(5, Number(body.appointmentDuration) || 15),
    isOpen: body.isOpen !== false,
    updatedAt: new Date(),
  };
}

router.get("/outpatient/clinics", requireAnyPageAccess([PAGE], "view"), async (req, res) => {
  const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
  const clinics = await db.select().from(outpatientClinicsTable).orderBy(asc(outpatientClinicsTable.name));
  const appointments = await db.select().from(outpatientAppointmentsTable).where(eq(outpatientAppointmentsTable.appointmentDate, date)).orderBy(asc(outpatientAppointmentsTable.queueNumber));
  res.json(clinics.map(clinic => {
    const clinicAppointments = appointments.filter(item => item.clinicId === clinic.id);
    return { ...clinic, date, appointmentsCount: clinicAppointments.filter(item => item.status !== "cancelled").length, waitingCount: clinicAppointments.filter(item => ["waiting", "called", "in_service"].includes(item.status)).length, appointments: clinicAppointments };
  }));
});

router.post("/outpatient/clinics", requireFounder, async (req, res) => {
  const values = clinicPayload(req.body);
  if (!values.name || !values.doctorName) { res.status(400).json({ error: "اسم العيادة واسم الطبيب مطلوبان" }); return; }
  const [{ id }] = await db.insert(outpatientClinicsTable).values(values).returning({ id: outpatientClinicsTable.id });
  const [clinic] = await db.select().from(outpatientClinicsTable).where(eq(outpatientClinicsTable.id, id));
  res.status(201).json(clinic);
});

router.patch("/outpatient/clinics/:id", requireFounder, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "معرف العيادة غير صالح" }); return; }
  const values = clinicPayload(req.body);
  if (!values.name || !values.doctorName) { res.status(400).json({ error: "اسم العيادة واسم الطبيب مطلوبان" }); return; }
  await db.update(outpatientClinicsTable).set(values).where(eq(outpatientClinicsTable.id, id));
  const [clinic] = await db.select().from(outpatientClinicsTable).where(eq(outpatientClinicsTable.id, id));
  if (!clinic) { res.status(404).json({ error: "العيادة غير موجودة" }); return; }
  res.json(clinic);
});

router.delete("/outpatient/clinics/:id", requireFounder, async (req, res) => {
  const id = Number(req.params.id);
  const appointments = await db.select({ id: outpatientAppointmentsTable.id }).from(outpatientAppointmentsTable).where(eq(outpatientAppointmentsTable.clinicId, id));
  if (appointments.length) { res.status(409).json({ error: "لا يمكن حذف عيادة لها حجوزات؛ أغلقها بدلًا من حذفها" }); return; }
  await db.delete(outpatientClinicsTable).where(eq(outpatientClinicsTable.id, id));
  res.json({ success: true });
});

router.post("/outpatient/appointments", requirePageAccess(PAGE, "edit"), requireOutpatientRole(["reception"]), async (req, res) => {
  const body = req.body ?? {};
  const clinicId = Number(body.clinicId);
  const date = String(body.appointmentDate ?? "");
  const source = VALID_SOURCES.has(body.source) ? body.source : "system";
  if (!clinicId || !String(body.patientName ?? "").trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { res.status(400).json({ error: "العيادة واسم الحالة وتاريخ الحجز مطلوبة" }); return; }
  const [clinic] = await db.select().from(outpatientClinicsTable).where(eq(outpatientClinicsTable.id, clinicId));
  if (!clinic) { res.status(404).json({ error: "العيادة غير موجودة" }); return; }
  const [{ maxQueue }] = await db.select({ maxQueue: sql<number>`coalesce(max(${outpatientAppointmentsTable.queueNumber}), 0)` }).from(outpatientAppointmentsTable).where(and(eq(outpatientAppointmentsTable.clinicId, clinicId), eq(outpatientAppointmentsTable.appointmentDate, date)));
  const queueNumber = Number(maxQueue ?? 0) + 1;
  const [{ id }] = await db.insert(outpatientAppointmentsTable).values({ clinicId, patientName: String(body.patientName).trim(), age: body.age ? String(body.age) : null, phone: body.phone ? String(body.phone).trim() : null, nationalId: body.nationalId ? String(body.nationalId).trim() : null, appointmentDate: date, appointmentTime: body.appointmentTime ? String(body.appointmentTime) : null, queueNumber, source, status: "waiting", notes: body.notes ? String(body.notes).trim() : null, updatedAt: new Date() }).returning({ id: outpatientAppointmentsTable.id });
  const [appointment] = await db.select().from(outpatientAppointmentsTable).where(eq(outpatientAppointmentsTable.id, id));
  res.status(201).json(appointment);
});

router.patch("/outpatient/clinics/:id/status", requirePageAccess(PAGE, "edit"), requireOutpatientRole(["reception"]), async (req, res) => {
  const id = Number(req.params.id);
  await db.update(outpatientClinicsTable).set({ isOpen: req.body.isOpen === true, updatedAt: new Date() }).where(eq(outpatientClinicsTable.id, id));
  const [clinic] = await db.select().from(outpatientClinicsTable).where(eq(outpatientClinicsTable.id, id));
  if (!clinic) { res.status(404).json({ error: "العيادة غير موجودة" }); return; }
  res.json(clinic);
});

router.post("/outpatient/clinics/:id/next", requirePageAccess(PAGE, "edit"), requireOutpatientRole(["doctor", "nurse"]), async (req, res) => {
  const id = Number(req.params.id);
  const date = typeof req.body.date === "string" ? req.body.date : new Date().toISOString().slice(0, 10);
  const [next] = await db.select().from(outpatientAppointmentsTable)
    .where(and(eq(outpatientAppointmentsTable.clinicId, id), eq(outpatientAppointmentsTable.appointmentDate, date), eq(outpatientAppointmentsTable.status, "waiting")))
    .orderBy(asc(outpatientAppointmentsTable.queueNumber)).limit(1);
  if (!next) { res.status(404).json({ error: "لا توجد حالة تالية في الانتظار" }); return; }
  await db.update(outpatientAppointmentsTable).set({ status: "called", updatedAt: new Date() }).where(eq(outpatientAppointmentsTable.id, next.id));
  res.json({ ...next, status: "called" });
});

router.patch("/outpatient/appointments/:id", requirePageAccess(PAGE, "edit"), requireOutpatientRole(["reception", "doctor", "nurse"]), async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (req.body.status && VALID_STATUSES.has(req.body.status)) updates.status = req.body.status;
  if (req.body.appointmentTime !== undefined) updates.appointmentTime = req.body.appointmentTime || null;
  if (req.body.notes !== undefined) updates.notes = req.body.notes || null;
  await db.update(outpatientAppointmentsTable).set(updates).where(eq(outpatientAppointmentsTable.id, id));
  const [appointment] = await db.select().from(outpatientAppointmentsTable).where(eq(outpatientAppointmentsTable.id, id));
  if (!appointment) { res.status(404).json({ error: "الحجز غير موجود" }); return; }
  res.json(appointment);
});

export default router;
