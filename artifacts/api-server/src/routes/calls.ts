import { Router, type IRouter } from "express";
import { getCurrentUserName, requireFounder } from "../middleware/auth";

const router: IRouter = Router();
type Signal = { id: number; from: string; to: string; type: string; payload: unknown; createdAt: number };
type Call = { id: string; owner: string; recipients: string[]; createdAt: number; closedAt: number | null; signals: Signal[]; joined: string[] };
const calls = new Map<string, Call>();
let nextSignalId = 1;

function getCall(id: string): Call | undefined { return calls.get(id); }
function cleanup() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, call] of calls) if ((call.closedAt ?? call.createdAt) < cutoff) calls.delete(id);
}

router.post("/calls", requireFounder, (req, res) => {
  cleanup();
  const audience = req.body?.audience === "all_online" ? "all_online" : "selected";
  const rawRecipients: unknown[] = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
  const recipients: string[] = [...new Set(rawRecipients.map(x => String(x).trim()).filter(x => Boolean(x)))];
  if (!recipients.length) { res.status(400).json({ error: "حدد مستخدمًا واحدًا على الأقل للمكالمة" }); return; }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const call: Call = { id, owner: "المؤسس", recipients, createdAt: Date.now(), closedAt: null, signals: [], joined: [] };
  calls.set(id, call);
  res.status(201).json({ id, owner: call.owner, audience, recipients, createdAt: call.createdAt });
});

router.get("/calls/incoming", (req, res) => {
  cleanup();
  const user = getCurrentUserName(req.headers.cookie);
  const active = [...calls.values()].filter(c => !c.closedAt && c.recipients.includes(user));
  res.json(active.map(c => ({ id: c.id, owner: c.owner, createdAt: c.createdAt, joined: c.joined.includes(user) })));
});

router.post("/calls/:id/join", (req, res) => {
  const call = getCall(req.params.id);
  const user = getCurrentUserName(req.headers.cookie);
  if (!call || call.closedAt) { res.status(404).json({ error: "المكالمة غير متاحة" }); return; }
  if (user !== call.owner && !call.recipients.includes(user)) { res.status(403).json({ error: "لست ضمن مستلمي هذه المكالمة" }); return; }
  if (!call.joined.includes(user)) call.joined.push(user);
  res.json({ ok: true, callId: call.id, owner: call.owner });
});

router.get("/calls/:id/signals", (req, res) => {
  const call = getCall(req.params.id);
  const user = getCurrentUserName(req.headers.cookie);
  if (!call || (user !== call.owner && !call.recipients.includes(user))) { res.status(404).json({ error: "المكالمة غير متاحة" }); return; }
  const after = Number(req.query.after ?? 0);
  res.json({ closed: Boolean(call.closedAt), signals: call.signals.filter(s => s.id > after && s.to === user) });
});

router.post("/calls/:id/signals", (req, res) => {
  const call = getCall(req.params.id);
  const user = getCurrentUserName(req.headers.cookie);
  if (!call || call.closedAt) { res.status(404).json({ error: "المكالمة غير متاحة" }); return; }
  const to = String(req.body?.to ?? "").trim();
  const type = String(req.body?.type ?? "").trim();
  if (!to || !type || (user !== call.owner && !call.recipients.includes(user)) || (to !== call.owner && !call.recipients.includes(to))) {
    res.status(403).json({ error: "إشارة مكالمة غير مصرح بها" }); return;
  }
  const signal: Signal = { id: nextSignalId++, from: user, to, type, payload: req.body?.payload ?? null, createdAt: Date.now() };
  call.signals.push(signal);
  while (call.signals.length > 1000) call.signals.shift();
  res.status(201).json({ ok: true, id: signal.id });
});

router.post("/calls/:id/close", requireFounder, (req, res) => {
  const call = getCall(String(req.params.id));
  if (!call) { res.status(404).json({ error: "المكالمة غير موجودة" }); return; }
  call.closedAt = Date.now();
  res.json({ ok: true, closedAt: call.closedAt });
});

export default router;
