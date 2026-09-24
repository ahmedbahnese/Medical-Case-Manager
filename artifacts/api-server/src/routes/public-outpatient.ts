import { Router, type Request, type Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, outpatientAppointmentsTable, outpatientClinicsTable } from "@workspace/db";

const router = Router();
const publicHits = new Map<string, { count: number; resetAt: number }>();
const streams = new Map<string, Set<Response>>();

function allowed(ip: string) {
  const now = Date.now();
  const hit = publicHits.get(ip);
  if (!hit || hit.resetAt < now) { publicHits.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (hit.count >= 120) return false;
  hit.count += 1;
  return true;
}

function publicPayload(appointment: any, clinic: any, all: any[]) {
  const terminal = new Set(["completed", "cancelled", "no_show", "skipped"]);
  const current = all.filter(a => ["called", "in_service", "completed"].includes(a.status)).sort((a, b) => b.queueNumber - a.queueNumber)[0]?.queueNumber ?? 0;
  const remaining = all.filter(a => a.queueNumber > current && a.queueNumber <= appointment.queueNumber && !terminal.has(a.status)).length;
  return {
    clinicName: clinic.name, specialty: clinic.specialty, doctorName: clinic.doctorName, room: clinic.room,
    appointmentDate: appointment.appointmentDate, appointmentTime: appointment.appointmentTime,
    queueNumber: appointment.queueNumber, currentQueueNumber: current, remaining,
    clinicOpen: clinic.isOpen, status: appointment.status,
    statusLabel: ({ waiting: "في الانتظار", called: "تم النداء", in_service: "داخل الكشف", completed: "اكتملت", cancelled: "ملغى", no_show: "لم يحضر", skipped: "تم التخطي" } as Record<string, string>)[appointment.status] ?? appointment.status,
    expired: false,
  };
}

async function lookup(token: string) {
  const [appointment] = await db.select().from(outpatientAppointmentsTable).where(eq(outpatientAppointmentsTable.publicToken, token)).limit(1);
  if (!appointment) return null;
  if (appointment.publicTokenExpiresAt && appointment.publicTokenExpiresAt.getTime() < Date.now()) return { expired: true } as const;
  const [clinic] = await db.select().from(outpatientClinicsTable).where(eq(outpatientClinicsTable.id, appointment.clinicId));
  if (!clinic) return null;
  const all = await db.select().from(outpatientAppointmentsTable).where(and(eq(outpatientAppointmentsTable.clinicId, appointment.clinicId), eq(outpatientAppointmentsTable.appointmentDate, appointment.appointmentDate))).orderBy(asc(outpatientAppointmentsTable.queueNumber));
  return publicPayload(appointment, clinic, all);
}

router.get("/outpatient/public/:token", async (req: Request, res: Response) => {
  if (!allowed(String(req.ip))) { res.status(429).json({ error: "محاولات كثيرة، حاول بعد دقيقة" }); return; }
  const token = String(req.params.token ?? "");
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) { res.status(404).json({ error: "الرابط غير صالح أو انتهت صلاحيته" }); return; }
  const payload = await lookup(token);
  if (!payload) { res.status(404).json({ error: "الرابط غير صالح أو انتهت صلاحيته" }); return; }
  res.json(payload);
});

router.get("/outpatient/public/:token/stream", async (req: Request, res: Response) => {
  if (!allowed(String(req.ip))) { res.status(429).end(); return; }
  const token = String(req.params.token ?? "");
  const initial = await lookup(token);
  if (!initial) { res.status(404).end(); return; }
  res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const set = streams.get(token) ?? new Set<Response>();
  set.add(res); streams.set(token, set);
  res.write(`data: ${JSON.stringify(initial)}\n\n`);
  const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), 20_000);
  req.on("close", () => { clearInterval(keepAlive); set.delete(res); if (!set.size) streams.delete(token); });
});

export async function notifyPublicQueue(clinicId: number, date: string) {
  for (const [token, clients] of streams) {
    if (!clients.size) continue;
    const [appointment] = await db.select({ clinicId: outpatientAppointmentsTable.clinicId, appointmentDate: outpatientAppointmentsTable.appointmentDate }).from(outpatientAppointmentsTable).where(eq(outpatientAppointmentsTable.publicToken, token)).limit(1);
    if (!appointment || appointment.clinicId !== clinicId || appointment.appointmentDate !== date) continue;
    const payload = await lookup(token);
    if (!payload) continue;
    for (const client of clients) client.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

export default router;
