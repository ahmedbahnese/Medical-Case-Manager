import { Router, type IRouter } from "express";
import { FounderLoginBody } from "@workspace/api-zod";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logAction } from "./audit-logs";

const router: IRouter = Router();

const SESSION_COOKIE = "bsch_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

function getSessionFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [k, v] = pair.trim().split("=");
    if (k?.trim() === SESSION_COOKIE) return decodeURIComponent(v?.trim() ?? "");
  }
  return null;
}

async function getFounderPassword(): Promise<string> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "login_password"));
    if (row?.value) return row.value;
  } catch {}
  return process.env.FOUNDER_PASSWORD ?? "bsch2024";
}

/** Returns [{name, password}] or [] */
async function getNamedPasswords(): Promise<Array<{ name: string; password: string }>> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "named_passwords"));
    if (row?.value) return JSON.parse(row.value);
  } catch {}
  return [];
}

function parseSession(raw: string | null): { isAuthenticated: boolean; isFounder: boolean; name: string | null } {
  if (!raw) return { isAuthenticated: false, isFounder: false, name: null };
  if (raw === "founder") return { isAuthenticated: true, isFounder: true, name: "المؤسس" };
  if (raw.startsWith("user:")) {
    const name = raw.slice(5);
    return { isAuthenticated: true, isFounder: false, name };
  }
  return { isAuthenticated: false, isFounder: false, name: null };
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const session = getSessionFromCookieHeader(req.headers.cookie);
  res.json(parseSession(session));
});

router.post("/auth/founder-login", async (req, res): Promise<void> => {
  const parsed = FounderLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password } = parsed.data;
  const founderPassword = await getFounderPassword();

  // Check main (founder) password
  if (password === founderPassword) {
    res.cookie(SESSION_COOKIE, "founder", COOKIE_OPTIONS);
    await logAction("تسجيل دخول", "auth", null, "المؤسس", null, "المؤسس");
    res.json({ isAuthenticated: true, isFounder: true, name: "المؤسس" });
    return;
  }

  // Check named passwords
  const namedPasswords = await getNamedPasswords();
  const matched = namedPasswords.find(np => np.password === password);
  if (matched) {
    res.cookie(SESSION_COOKIE, `user:${matched.name}`, { ...COOKIE_OPTIONS });
    await logAction("تسجيل دخول", "auth", null, matched.name, null, matched.name);
    res.json({ isAuthenticated: true, isFounder: false, name: matched.name });
    return;
  }

  res.status(401).json({ error: "كلمة المرور غير صحيحة" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;
