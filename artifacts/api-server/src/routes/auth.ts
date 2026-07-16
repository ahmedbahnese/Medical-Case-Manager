import { Router, type IRouter } from "express";
import { FounderLoginBody } from "@workspace/api-zod";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
    if (k?.trim() === SESSION_COOKIE) return v?.trim() ?? null;
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

router.get("/auth/me", async (req, res): Promise<void> => {
  const session = getSessionFromCookieHeader(req.headers.cookie);
  if (!session || session !== "founder") {
    res.json({ isAuthenticated: false, isFounder: false, name: null });
    return;
  }
  res.json({ isAuthenticated: true, isFounder: true, name: "المؤسس" });
});

router.post("/auth/founder-login", async (req, res): Promise<void> => {
  const parsed = FounderLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const founderPassword = await getFounderPassword();
  if (parsed.data.password !== founderPassword) {
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    return;
  }

  res.cookie(SESSION_COOKIE, "founder", COOKIE_OPTIONS);
  res.json({ isAuthenticated: true, isFounder: true, name: "المؤسس" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;
