import { Request, Response, NextFunction } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "bsch_session";

function getSession(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [k, v] = pair.trim().split("=");
    if (k?.trim() === SESSION_COOKIE) return decodeURIComponent(v?.trim() ?? "");
  }
  return null;
}

export function getCurrentUserName(cookieHeader: string | undefined): string {
  const session = getSession(cookieHeader);
  if (session === "founder") return "المؤسس";
  if (session?.startsWith("user:")) return session.slice(5) || "مستخدم النظام";
  return "مستخدم النظام";
}

export type UserRole = "founder" | "quality" | "infection_control" | "insurance" | "statistics" | "user";
export interface CurrentUserAccess { name: string; role: UserRole; isFounder: boolean; canSubmitOvr: boolean; canReviewOvr: boolean; }

export async function getCurrentUserAccess(cookieHeader: string | undefined): Promise<CurrentUserAccess> {
  const session = getSession(cookieHeader);
  if (session === "founder") return { name: "المؤسس", role: "founder", isFounder: true, canSubmitOvr: true, canReviewOvr: true };
  if (!session?.startsWith("user:")) return { name: "مستخدم النظام", role: "user", isFounder: false, canSubmitOvr: false, canReviewOvr: false };
  const name = session.slice(5) || "مستخدم النظام";
  let role: UserRole = "user";
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "named_passwords"));
    const users = row?.value ? JSON.parse(row.value) as Array<{name?: string; role?: UserRole; pagePermissions?: Array<{href: string; access: string}>}> : [];
    const account = users.find(u => u.name === name);
    role = account?.role ?? (account?.pagePermissions?.some(p => p.href === "/incident-report" && p.access === "edit") ? "quality" : "user");
  } catch { role = "user"; }
  return { name, role, isFounder: false, canSubmitOvr: true, canReviewOvr: role === "quality" };
}

/** Require any valid session (founder or named user) */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req.headers.cookie);
  if (!session) {
    res.status(401).json({ error: "غير مصرح — يرجى تسجيل الدخول" });
    return;
  }
  if (session === "founder" || session.startsWith("user:")) {
    next();
    return;
  }
  res.status(401).json({ error: "جلسة غير صالحة" });
}

/** Require founder session only */
export function requireFounder(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req.headers.cookie);
  if (session === "founder") {
    next();
    return;
  }
  res.status(403).json({ error: "هذه العملية تتطلب صلاحيات المؤسس" });
}
