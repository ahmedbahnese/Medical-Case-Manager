import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

const SETTINGS_PASSWORD = process.env.SETTINGS_PASSWORD ?? "@Bahnasy";

// Get all settings (public keys only - no passwords returned)
router.get("/settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string | null> = {};
  for (const row of rows) {
    if (row.key !== "settings_password") {
      map[row.key] = row.value;
    }
  }
  res.json(map);
});

// Update a setting (requires settings password)
router.post("/settings", async (req, res): Promise<void> => {
  const { password, key, value } = req.body as { password?: string; key?: string; value?: string };

  if (!key || value === undefined) {
    res.status(400).json({ error: "key و value مطلوبان" });
    return;
  }

  // Verify password for sensitive operations
  const sensitiveKeys = ["hospital_name", "logo_base64", "theme", "login_password", "settings_password", "admin_users"];
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
router.post("/settings/verify-password", async (req, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (password === SETTINGS_PASSWORD) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false, error: "كلمة المرور غير صحيحة" });
  }
});

export default router;
