import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireFounder, getCurrentUserAccess } from "../middleware/auth";

const router: IRouter = Router();

const SETTINGS_PASSWORD = process.env.SETTINGS_PASSWORD ?? "@Bahnasy";

// Get all settings (public keys only - no passwords returned)
router.get("/settings", async (req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string | null> = {};
  const publicKeys = new Set(["hospital_name", "logo_base64", "theme_color", "watermark_enabled", "supervisors"]);
  const founderIntegrationKeys = new Set(["whatsapp_enabled", "whatsapp_phone_number_id", "whatsapp_business_account_id", "whatsapp_verify_token", "whatsapp_group_id", "telegram_enabled", "telegram_chat_id", "ai_assessment_template", "clinic_booking_template", "clinic_confirmation_template", "clinic_weekly_schedule"]);
  const isFounder = (await getCurrentUserAccess(req.headers.cookie)).isFounder;
  for (const row of rows) {
    if (publicKeys.has(row.key) || (isFounder && (row.key === "named_passwords" || founderIntegrationKeys.has(row.key)))) {
      map[row.key] = row.value;
    }
  }
  res.json(map);
});

// Update a setting (requires settings password)
router.post("/settings", requireFounder, async (req, res): Promise<void> => {
  const { password, key, value } = req.body as { password?: string; key?: string; value?: string };

  if (!key || value === undefined) {
    res.status(400).json({ error: "key و value مطلوبان" });
    return;
  }

  // Verify password for sensitive operations
  const sensitiveKeys = ["hospital_name", "logo_base64", "theme", "login_password", "settings_password", "admin_users", "whatsapp_verify_token", "whatsapp_access_token", "telegram_bot_token"];
  if (sensitiveKeys.includes(key)) {
    if (password !== SETTINGS_PASSWORD) {
      res.status(401).json({ error: "كلمة مرور الإعدادات غير صحيحة" });
      return;
    }
  }

  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  if (existing.length > 0) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }

  res.json({ success: true });
});

// Verify settings password
router.post("/settings/verify-password", requireFounder, async (req, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (password === SETTINGS_PASSWORD) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false, error: "كلمة المرور غير صحيحة" });
  }
});

export default router;
