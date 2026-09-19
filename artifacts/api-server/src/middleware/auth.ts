import { Request, Response, NextFunction, RequestHandler } from "express";
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

type PagePermission = { href: string; access: "none" | "view" | "edit" };
type NamedAccessRecord = { name?: string; canEdit?: boolean; allowedPages?: string[]; pagePermissions?: PagePermission[] };

async function getNamedAccess(name: string): Promise<NamedAccessRecord | undefined> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "named_passwords"));
    const users = row?.value ? JSON.parse(row.value) as NamedAccessRecord[] : [];
    return users.find(user => user.name === name);
  } catch { return undefined; }
}

export function pageAccess(record: NamedAccessRecord | undefined, href: string): "none" | "view" | "edit" {
  if (record?.pagePermissions?.length) return record.pagePermissions.find(p => p.href === href)?.access ?? "none";
  if (record?.allowedPages?.length && !record.allowedPages.includes(href)) return "none";
  return record?.canEdit === false ? "view" : "edit";
}

function meetsAccess(actual: "none" | "view" | "edit", required: "view" | "edit") {
  return required === "view" ? actual === "view" || actual === "edit" : actual === "edit";
}

export function requirePageAccess(href: string, required: "view" | "edit" = "view"): RequestHandler {
  return async (req, res, next) => {
    const session = getSession(req.headers.cookie);
    if (session === "founder") { next(); return; }
    const name = session?.startsWith("user:") ? session.slice(5) : "";
    const access = pageAccess(await getNamedAccess(name), href);
    if (meetsAccess(access, required)) { next(); return; }
    res.status(403).json({ error: "لا تملك الصلاحية المطلوبة لهذه الصفحة أو العملية" });
  };
}

export function requireAnyPageAccess(hrefs: string[], required: "view" | "edit" = "view"): RequestHandler {
  return async (req, res, next) => {
    const session = getSession(req.headers.cookie);
    if (session === "founder") { next(); return; }
    const name = session?.startsWith("user:") ? session.slice(5) : "";
    const record = await getNamedAccess(name);
    if (hrefs.some(href => meetsAccess(pageAccess(record, href), required))) { next(); return; }
    res.status(403).json({ error: "لا تملك الصلاحية المطلوبة لهذه العملية" });
  };
}

export async function getCurrentUserAccess(cookieHeader: string | undefined): Promise<CurrentUserAccess> {
  const session = getSession(cookieHeader);
  if (session === "founder") return { name: "المؤسس", role: "founder", isFounder: true, canSubmitOvr: true, canReviewOvr: true };
  if (!session?.startsWith("user:")) return { name: "مستخدم النظام", role: "user", isFounder: false, canSubmitOvr: false, canReviewOvr: false };
  const name = session.slice(5) || "مستخدم النظام";
  let role: UserRole = "user";
  const account = await getNamedAccess(name);
  role = (account as NamedAccessRecord & { role?: UserRole } | undefined)?.role ?? "user";
  const canSubmitOvr = meetsAccess(pageAccess(account, "/ovr-incident-report"), "edit");
  const canReviewOvr = meetsAccess(pageAccess(account, "/ovr-management"), "view");
  return { name, role, isFounder: false, canSubmitOvr, canReviewOvr };
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
