import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, notificationsTable, settingsTable } from "@workspace/db";
import { getCurrentUserName, requireFounder } from "../middleware/auth";

const router: IRouter = Router();
type Presence = { name: string; lastSeen: number; isFounder: boolean };
const online = new Map<string, Presence>();
const ONLINE_WINDOW_MS = 90_000;

function jsonArray(value: string | null | undefined): string[] {
  try { const parsed = JSON.parse(value ?? "[]"); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}
function activeNames(): string[] {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  return [...online.values()].filter(p => p.lastSeen >= cutoff).map(p => p.name);
}

router.post("/presence/heartbeat", (req, res) => {
  const name = getCurrentUserName(req.headers.cookie);
  online.set(name, { name, lastSeen: Date.now(), isFounder: name === "المؤسس" });
  res.json({ ok: true, name });
});
router.get("/presence/online", requireFounder, (_req, res) => {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  res.json([...online.values()].filter(p => p.lastSeen >= cutoff).sort((a, b) => b.lastSeen - a.lastSeen));
});
router.get("/presence/users", requireFounder, async (_req, res): Promise<void> => {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "named_passwords"));
  let configured: string[] = [];
  try { configured = row?.value ? (JSON.parse(row.value) as Array<{ name?: string }>).map(u => u.name ?? "").filter(Boolean) : []; } catch { configured = []; }
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const onlineNames = new Set([...online.values()].filter(p => p.lastSeen >= cutoff).map(p => p.name));
  res.json([...new Set(["المؤسس", ...configured])].map(name => ({ name, isOnline: onlineNames.has(name) })));
});

// Returns only messages addressed to the current user. The history is stored in SQLite.
router.get("/notifications", async (req, res): Promise<void> => {
  const user = getCurrentUserName(req.headers.cookie);
  const since = Number(req.query.since ?? 0);
  const history = req.query.history === "1" && user === "المؤسس";
  const rows = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.id)).limit(history ? 500 : 200);
  const visible = rows.filter(row => history || (row.id > since && jsonArray(row.recipientsJson).includes(user))).reverse();
  res.json(visible.map(row => ({ ...row, from: row.fromUser, recipients: jsonArray(row.recipientsJson), readBy: jsonArray(row.readByJson) })));
});

router.post("/notifications", requireFounder, async (req, res): Promise<void> => {
  const message = String(req.body?.message ?? "").trim();
  // WebRTC voice calls were removed for Windows 7 compatibility.
  const delivery = "announcement";
  const tone = ["single", "double", "soft"].includes(String(req.body?.tone)) ? String(req.body.tone) : "single";
  const toneDurationMs = Math.max(80, Math.min(1000, Number(req.body?.toneDurationMs) || 180));
  const speak = req.body?.speak === false ? 0 : 1;
  const speechLanguage = ["auto", "ar", "en"].includes(String(req.body?.speechLanguage)) ? String(req.body.speechLanguage) : "auto";
  const audience = req.body?.audience === "all_online" ? "all_online" : "selected";
  const requested: string[] = Array.isArray(req.body?.recipients) ? req.body.recipients.map((value: unknown) => String(value).trim()).filter((value: string) => Boolean(value)) : [];
  const recipients = audience === "all_online" ? activeNames() : [...new Set(requested)];
  if (!message) { res.status(400).json({ error: "اكتب نص الرسالة" }); return; }
  if (recipients.length === 0) { res.status(400).json({ error: "حدد مستخدمًا واحدًا على الأقل أو اختر جميع المتصلين" }); return; }
  const [created] = await db.insert(notificationsTable).values({
    message: message.slice(0, 500), fromUser: "المؤسس", delivery, tone, toneDurationMs, speak, speechLanguage, audience, recipientsJson: JSON.stringify(recipients), readByJson: "[]",
  }).returning();
  res.status(201).json({ ...created, recipients, readBy: [] });
});

// A notification doubles as a lightweight chat message: recipients can reply
// immediately, and the founder receives the reply through the same fast channel.
router.post("/notifications/:id/reply", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const user = getCurrentUserName(req.headers.cookie);
  const message = String(req.body?.message ?? "").trim().slice(0, 500);
  const [source] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
  if (!source) { res.status(404).json({ error: "الرسالة غير موجودة" }); return; }
  if (!jsonArray(source.recipientsJson).includes(user)) { res.status(403).json({ error: "لا يمكن الرد على هذه الرسالة" }); return; }
  if (!message) { res.status(400).json({ error: "اكتب نص الرد" }); return; }
  const [created] = await db.insert(notificationsTable).values({
    message, fromUser: user, delivery: "announcement", tone: "single", toneDurationMs: 180,
    speak: 1, speechLanguage: "auto", audience: "selected", recipientsJson: JSON.stringify(["المؤسس"]), readByJson: "[]",
  }).returning();
  res.status(201).json({ ...created, from: user, recipients: ["المؤسس"], readBy: [] });
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const user = getCurrentUserName(req.headers.cookie);
  const [row] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
  if (!row) { res.status(404).json({ error: "الإشعار غير موجود" }); return; }
  if (!jsonArray(row.recipientsJson).includes(user)) { res.status(403).json({ error: "هذا الإشعار ليس موجهًا لهذا المستخدم" }); return; }
  const readBy = [...new Set([...jsonArray(row.readByJson), user])];
  await db.update(notificationsTable).set({ readByJson: JSON.stringify(readBy) }).where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

export default router;
