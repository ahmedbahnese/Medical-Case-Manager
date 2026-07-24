import { Request, Response, NextFunction } from "express";

const SESSION_COOKIE = "bsch_session";

function getSession(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [k, v] = pair.trim().split("=");
    if (k?.trim() === SESSION_COOKIE) return decodeURIComponent(v?.trim() ?? "");
  }
  return null;
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
