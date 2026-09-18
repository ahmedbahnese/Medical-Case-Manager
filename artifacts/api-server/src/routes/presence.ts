import { Router, type IRouter } from "express";
import { getCurrentUserName, requireFounder } from "../middleware/auth";

const router: IRouter = Router();
type Presence = { name: string; lastSeen: number; isFounder: boolean };
type Notice = { id: number; message: string; createdAt: number; from: string };
const online = new Map<string, Presence>();
const notices: Notice[] = [];
let nextNoticeId = 1;

router.post("/presence/heartbeat", (req, res) => {
  const name = getCurrentUserName(req.headers.cookie);
  online.set(name, { name, lastSeen: Date.now(), isFounder: name === "المؤسس" });
  res.json({ ok: true, name });
});
router.get("/presence/online", requireFounder, (_req, res) => {
  const cutoff = Date.now() - 90_000;
  res.json([...online.values()].filter(p => p.lastSeen >= cutoff).sort((a, b) => b.lastSeen - a.lastSeen));
});
router.get("/notifications", (req, res) => {
  const since = Number(req.query.since ?? 0);
  res.json(notices.filter(n => n.id > since).slice(-50));
});
router.post("/notifications", requireFounder, (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  if (!message) { res.status(400).json({ error: "اكتب نص الرسالة" }); return; }
  const notice: Notice = { id: nextNoticeId++, message: message.slice(0, 500), createdAt: Date.now(), from: "المؤسس" };
  notices.push(notice);
  while (notices.length > 100) notices.shift();
  res.status(201).json(notice);
});
export default router;
