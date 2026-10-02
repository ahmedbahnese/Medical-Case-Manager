import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, inboundMessagesTable, outpatientBookingRequestsTable, outpatientClinicsTable, settingsTable, waitingCasesTable } from "@workspace/db";
import { requirePageAccess } from "../middleware/auth";

const router = Router();
const setting = async (key: string) => (await db.select({ value: settingsTable.value }).from(settingsTable).where(eq(settingsTable.key, key)).limit(1))[0]?.value ?? "";
const clean = (value: unknown) => String(value ?? "—").trim() || "—";
const careLabel: Record<string, string> = { intensive_care_high: "عناية", intensive_care_medium: "عناية", picu: "عناية", incubator: "حضانة", internal: "داخلي" };

async function assessmentText(caseItem: any) {
  const template = await setting("ai_assessment_template");
  const values: Record<string, string> = {
    hospitalName: await setting("hospital_name") || "مستشفي الاطفال التخصصي بدمسنا",
    patientName: clean(caseItem.patientName), age: clean(caseItem.age), address: clean(caseItem.address), diagnosis: clean(caseItem.diagnosis), phone: clean(caseItem.parentPhone), nationalId: clean(caseItem.nationalId), careType: careLabel[caseItem.careType] ?? clean(caseItem.careType), transferSource: "عن طريق الأهل",
  };
  const fallback = `حالة تحت التقييم بمستشفي ${values.hospitalName}\n\nالاسم: ${values.patientName}\nالسن: ${values.age}\nالعنوان: ${values.address}\nالتشخيص: ${values.diagnosis}\nجهة التحويل: ${values.transferSource}\nرقم الهاتف: ${values.phone}\nالرقم القومي: ${values.nationalId}\nالعرض: ${values.careType}\n\nفي انتظار تقييم الأطباء وسنوافيكم\nولسيادتكم جزيل الشكر`;
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, value), template || fallback);
}

async function sendWhatsApp(text: string) {
  const enabled = await setting("whatsapp_enabled");
  const token = await setting("whatsapp_access_token");
  const phoneNumberId = await setting("whatsapp_phone_number_id");
  const groupId = await setting("whatsapp_group_id");
  if (enabled !== "true" || !token || !phoneNumberId || !groupId) throw new Error("إعدادات WhatsApp غير مكتملة");
  const version = await setting("whatsapp_graph_version") || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "group", to: groupId, type: "text", text: { preview_url: false, body: text } }) });
  if (!response.ok) throw new Error(`WhatsApp: ${await response.text()}`);
  return response.json();
}

async function sendTelegram(text: string) {
  const enabled = await setting("telegram_enabled");
  const token = await setting("telegram_bot_token");
  const chatId = await setting("telegram_chat_id");
  if (enabled !== "true" || !token || !chatId) throw new Error("إعدادات Telegram غير مكتملة");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
  if (!response.ok) throw new Error(`Telegram: ${await response.text()}`);
  return response.json();
}

function extractBookingRequest(text: string, clinics: any[]) {
  const lower = text.toLocaleLowerCase();
  const clinic = clinics.find(c => lower.includes(String(c.name).toLocaleLowerCase()) || (c.specialty && lower.includes(String(c.specialty).toLocaleLowerCase())));
  const phone = text.match(/(?:01|\+?20\s?1)\d[\s-]?\d{8,}/)?.[0]?.replace(/[\s-]/g, "") ?? null;
  const age = text.match(/(?:العمر|السن)\s*[:：]?\s*(\d+)/)?.[1] ?? null;
  const name = text.match(/(?:الاسم|اسمي)\s*[:：]?\s*([^،,\n]+)/)?.[1]?.trim() ?? null;
  const extracted = { patientName: name, age, phone, clinicId: clinic?.id ?? null, clinicName: clinic?.name ?? null, serviceType: null, requestedDay: text.match(/(الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)/)?.[1] ?? null };
  const missingFields = Object.entries(extracted).filter(([key, value]) => ["patientName", "phone", "clinicId"].includes(key) && !value).map(([key]) => key);
  return { extracted, missingFields };
}

export async function sendAssessmentToConfiguredChannels(caseItem: any) {
  const text = await assessmentText(caseItem);
  const results: Record<string, unknown> = { text };
  try { results.whatsapp = await sendWhatsApp(text); } catch (error: any) { results.whatsappError = error.message; }
  try { results.telegram = await sendTelegram(text); } catch (error: any) { results.telegramError = error.message; }
  return results;
}

router.post("/waiting-cases/:id/assessment/send", requirePageAccess("/waiting-cases", "edit"), async (req, res) => {
  const id = Number(req.params.id);
  const [caseItem] = await db.select().from(waitingCasesTable).where(eq(waitingCasesTable.id, id));
  if (!caseItem) { res.status(404).json({ error: "الحالة غير موجودة" }); return; }
  const results = await sendAssessmentToConfiguredChannels(caseItem);
  if (!results.whatsapp && !results.telegram) { res.status(502).json({ error: "فشل الإرسال إلى القنوات", details: results }); return; }
  res.json(results);
});

router.get("/webhooks/whatsapp", async (req, res) => {
  const mode = String(req.query["hub.mode"] ?? "");
  const token = String(req.query["hub.verify_token"] ?? "");
  const challenge = String(req.query["hub.challenge"] ?? "");
  if (mode === "subscribe" && token && token === await setting("whatsapp_verify_token")) { res.status(200).send(challenge); return; }
  res.sendStatus(403);
});

router.post("/webhooks/whatsapp", async (req, res) => {
  res.sendStatus(200);
  const payload = req.body ?? {};
  const messages = payload.entry?.flatMap((entry: any) => entry.changes ?? []).flatMap((change: any) => change.value?.messages ?? []) ?? [];
  for (const message of messages) {
    const body = message.text?.body ?? "";
    const [inbound] = await db.insert(inboundMessagesTable).values({ channel: "whatsapp", externalMessageId: message.id ?? null, senderId: message.from ?? "unknown", senderName: payload.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ?? null, body, rawPayload: JSON.stringify(message), status: "processed" }).onConflictDoNothing().returning();
    const result = extractBookingRequest(body, await db.select().from(outpatientClinicsTable));
    await db.insert(outpatientBookingRequestsTable).values({ channel: "whatsapp", senderId: message.from ?? null, rawText: body, extractedJson: JSON.stringify(result.extracted), missingFieldsJson: JSON.stringify(result.missingFields), status: result.missingFields.length ? "needs_data" : "needs_review" });
    if (inbound) await db.update(inboundMessagesTable).set({ status: result.missingFields.length ? "needs_data" : "needs_review" }).where(eq(inboundMessagesTable.id, inbound.id));
  }
});

router.post("/webhooks/telegram", async (req, res) => {
  const secret = await setting("telegram_webhook_secret");
  if (secret && req.header("X-Telegram-Bot-Api-Secret-Token") !== secret) { res.sendStatus(403); return; }
  res.sendStatus(200);
  const message = req.body?.message;
  if (message) {
    const body = message.text ?? "";
    const [inbound] = await db.insert(inboundMessagesTable).values({ channel: "telegram", externalMessageId: String(req.body.update_id ?? ""), senderId: String(message.from?.id ?? "unknown"), senderName: message.from?.first_name ?? null, body, rawPayload: JSON.stringify(req.body), status: "processed" }).onConflictDoNothing().returning();
    const result = extractBookingRequest(body, await db.select().from(outpatientClinicsTable));
    await db.insert(outpatientBookingRequestsTable).values({ channel: "telegram", senderId: String(message.from?.id ?? "unknown"), rawText: body, extractedJson: JSON.stringify(result.extracted), missingFieldsJson: JSON.stringify(result.missingFields), status: result.missingFields.length ? "needs_data" : "needs_review" });
    if (inbound) await db.update(inboundMessagesTable).set({ status: result.missingFields.length ? "needs_data" : "needs_review" }).where(eq(inboundMessagesTable.id, inbound.id));
  }
});

export default router;
