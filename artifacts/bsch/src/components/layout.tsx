import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useAppSettings } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import {
  Activity,
  Users,
  ListPlus,
  Search,
  Printer,
  Database,
  LogOut,
  Wind,
  Bot,
  ClipboardList,
  AlertTriangle,
  Settings,
  FileOutput,
  History,
  ShieldCheck,
  Bell,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PwaInstallPrompt, useSwUpdateToast } from "@/components/pwa-install-prompt";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

function playNotificationTone(tone: string = "single", durationMs = 180): Promise<void> {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve();
    const context = new AudioContextClass();
    const count = tone === "double" ? 2 : 1;
    const frequency = tone === "soft" ? 660 : 880;
    const gap = tone === "double" ? 70 : 0;
    const total = count * durationMs + (count - 1) * gap;
    for (let index = 0; index < count; index += 1) {
      const start = context.currentTime + (index * (durationMs + gap)) / 1000;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = tone === "soft" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + durationMs / 1000);
      if (index === count - 1) oscillator.addEventListener("ended", () => { void context.close(); }, { once: true });
    }
    return new Promise(resolve => window.setTimeout(resolve, total + 30));
  } catch { return Promise.resolve(); }
}

function speakNotification(item: { message: string; from: string; delivery?: string; tone?: string; toneDurationMs?: number; speak?: number; speechLanguage?: string }) {
  if (!item.message.trim()) return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  void playNotificationTone(item.tone, item.toneDurationMs).then(() => {
    if (item.speak === 0 || !("speechSynthesis" in window)) return;
    const lang = item.speechLanguage === "ar" ? "ar-EG" : item.speechLanguage === "en" ? "en-US" : /[\u0600-\u06FF]/.test(item.message) ? "ar-EG" : "en-US";
    const utterance = new SpeechSynthesisUtterance(item.message);
    utterance.lang = lang;
    utterance.voice = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())) ?? null;
    utterance.rate = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  });
}
function showSystemNotification(item: { message: string; from: string }) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(`BSCH — ${item.from}`, {
      body: item.message, icon: "/icons/icon-192.png", tag: "bsch-medical-notice", dir: "rtl", lang: "ar",
    });
    notification.onclick = () => { window.focus(); notification.close(); };
  } catch { /* unsupported in some old browsers */ }
}

const NAV_GROUPS = [
  {
    label: "الرئيسية",
    items: [
      { name: "لوحة التحكم", href: "/dashboard", icon: Activity },
      { name: "إضافة حالة", href: "/add-case", icon: ListPlus },
      { name: "قوائم الانتظار", href: "/waiting-cases", icon: Users },
      { name: "التنفس الصناعي", href: "/artificial-respiration", icon: Wind },
    ],
  },
  {
    label: "التقارير",
    items: [
      { name: "بيان الإشغال", href: "/occupancy-report", icon: ClipboardList },
      { name: "التقرير اليومي", href: "/print-reports", icon: Printer },
      { name: "إرسال بلاغ OVR", href: "/ovr-incident-report", icon: ShieldCheck },
      { name: "إدارة بلاغات OVR", href: "/ovr-management", icon: ClipboardList },
      { name: "بيانات الحوادث", href: "/incident-report", icon: AlertTriangle },
      { name: "لوحة مسؤول الجودة", href: "/quality-dashboard", icon: ShieldCheck },
    ],
  },
  {
    label: "البحث والسجلات",
    items: [
      { name: "بحث متقدم", href: "/advanced-search", icon: Search },
      { name: "سجل الخروج", href: "/discharge-history", icon: History },
      { name: "سجل العمليات", href: "/audit-log", icon: FileOutput, founderOnly: true },
    ],
  },
  {
    label: "الإعدادات والأدوات",
    items: [
      { name: "الاستيراد الذكي", href: "/bulk-import", icon: Bot },
      { name: "نسخ احتياطي", href: "/backup", icon: Database, founderOnly: true },
      { name: "الإعدادات", href: "/settings", icon: Settings, founderOnly: true },
    ],
  },
];

const LOGOUT_REASONS = [
  { value: "end_shift", label: "انتهاء الوردية" },
  { value: "break", label: "استراحة مؤقتة" },
  { value: "personal", label: "ظرف شخصي" },
  { value: "other", label: "أخرى" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const { hospital_name, logo_base64 } = useAppSettings();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [logoutReason, setLogoutReason] = useState("end_shift");
  const [onlineUsers, setOnlineUsers] = useState<Array<{ name: string; lastSeen: number }>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ name: string; isOnline: boolean }>>([]);
  const [showPresence, setShowPresence] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [noticeAudience, setNoticeAudience] = useState<"selected" | "all_online">("selected");
  const [noticeRecipients, setNoticeRecipients] = useState<string[]>([]);
  const noticeDelivery = "announcement" as const;
  const [noticeTone, setNoticeTone] = useState("single");
  const [noticeToneDurationMs, setNoticeToneDurationMs] = useState(180);
  const [noticeSpeak, setNoticeSpeak] = useState(true);
  const [noticeSpeechLanguage, setNoticeSpeechLanguage] = useState<"auto" | "ar" | "en">("auto");
  const [noticeHistory, setNoticeHistory] = useState<Array<{ id: number; message: string; delivery?: string; recipients: string[]; createdAt: string }>>([]);
  const [lastNoticeId, setLastNoticeId] = useState(Number(localStorage.getItem("bsch:last-notice") || 0));
  useEffect(() => {
    if (!(user as any)?.isAuthenticated) return;
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    const heartbeat = () => apiPost("/api/presence/heartbeat", {}).catch(() => {});
    const notices = () => apiGet<Array<{ id: number; message: string; from: string; delivery?: string; tone?: string; toneDurationMs?: number; speak?: number; speechLanguage?: string }>>(`/api/notifications?since=${lastNoticeId}`).then(items => {
      for (const item of items) {
        toast.info(`${item.from}: ${item.message}`, {
          duration: 8000,
          action: {
            label: "رد",
            onClick: () => {
              const reply = window.prompt("اكتب الرد على الرسالة:");
              if (reply?.trim()) apiPost(`/api/notifications/${item.id}/reply`, { message: reply.trim() }).then(() => toast.success("تم إرسال الرد فورياً")).catch((e: any) => toast.error(e.message));
            },
          },
        });
        speakNotification(item);
        showSystemNotification(item);
        apiPost(`/api/notifications/${item.id}/read`, {}).catch(() => {});
      }
      const latest = items.at(-1)?.id;
      if (latest) { setLastNoticeId(latest); localStorage.setItem("bsch:last-notice", String(latest)); }
    }).catch(() => {});
    heartbeat(); notices();
    const timer = window.setInterval(() => { heartbeat(); notices(); }, 3000);
    return () => window.clearInterval(timer);
  }, [(user as any)?.isAuthenticated, lastNoticeId]);
  useEffect(() => {
    if (!(user as any)?.isFounder) return;
    const load = () => apiGet<Array<{ name: string; lastSeen: number }>>("/api/presence/online").then(setOnlineUsers).catch(() => {});
    const loadUsers = () => apiGet<Array<{ name: string; isOnline: boolean }>>("/api/presence/users").then(setAvailableUsers).catch(() => {});
    load(); loadUsers(); const timer = window.setInterval(() => { load(); loadUsers(); }, 15000); return () => window.clearInterval(timer);
  }, [(user as any)?.isFounder]);
  useEffect(() => {
    if (!showPresence || !(user as any)?.isFounder) return;
    apiGet<Array<{ id: number; message: string; recipients: string[]; createdAt: string }>>("/api/notifications?history=1").then(setNoticeHistory).catch(() => {});
  }, [showPresence, (user as any)?.isFounder]);

  useSwUpdateToast();

  if (isLoading) return <div className="h-screen bg-background" />;

  const userAny = user as any;
  const isFounder: boolean = userAny?.isFounder ?? false;
  const pagePermissions: { href: string; access: string }[] = userAny?.pagePermissions ?? [];
  // Legacy fallback
  const legacyCanEdit: boolean = userAny?.canEdit !== false;
  const legacyAllowedPages: string[] = userAny?.allowedPages ?? [];

  const getPageAccess = (href: string): "none" | "view" | "edit" => {
    if (isFounder) return "edit";
    if (pagePermissions.length > 0) {
      const pp = pagePermissions.find(p => p.href === href);
      return (pp?.access ?? "none") as "none" | "view" | "edit";
    }
    // Legacy
    if (legacyAllowedPages.length > 0 && !legacyAllowedPages.includes(href)) return "none";
    return legacyCanEdit ? "edit" : "view";
  };

  // Derive canEdit for current page (for the sidebar badge)
  const currentPageAccess = getPageAccess(location);
  const canEdit = currentPageAccess === "edit";

  const isItemVisible = (item: { href: string; founderOnly?: boolean }) => {
    if (item.founderOnly && !isFounder) return false;
    if (!isFounder && getPageAccess(item.href) === "none") return false;
    return true;
  };

  const filteredGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(isItemVisible) }))
    .filter(g => g.items.length > 0);

  const allNav = filteredGroups.flatMap(g => g.items);

  const handleLogoutClick = () => {
    setLogoutReason("end_shift");
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    logout.mutate(undefined, {
      onSuccess: () => { window.location.href = "/"; }
    });
  };

  const isActive = (href: string) =>
    location === href || location.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-l border-sidebar-border h-screen sticky top-0 no-print shrink-0">
        <div className="p-4 flex items-center gap-3 text-sidebar-foreground border-b border-sidebar-border">
          {logo_base64 ? (
            <img src={logo_base64} alt="logo" className="h-9 w-9 rounded-lg object-contain bg-white p-0.5" />
          ) : (
            <Activity className="h-7 w-7 text-primary" />
          )}
          <div>
            <h1 className="font-bold text-lg leading-tight">BSCH</h1>
            <p className="text-xs text-sidebar-foreground/60 leading-tight max-w-[160px]">{hospital_name}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-sidebar-foreground/40 px-3 mb-1 uppercase tracking-wider">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          {!canEdit && (
            <div className="mb-2 px-2">
              <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                عرض فقط
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 px-2 py-1 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0) || "م"}
            </div>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground">{user?.name || "مستخدم النظام"}</p>
              <p className="text-xs text-sidebar-foreground/50">{isFounder ? "مدير النظام" : "طاقم طبي"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleLogoutClick}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border sticky top-0 z-10 no-print">
        <div className="flex items-center gap-2 text-sidebar-foreground">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-base">BSCH</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogoutClick} className="text-sidebar-foreground/80">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden flex overflow-x-auto p-2 bg-sidebar/50 border-b border-sidebar-border no-print gap-1 shrink-0">
        {allNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex whitespace-nowrap items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8 bg-background relative w-full">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2 no-print">
          {isFounder && <Button variant="outline" className="ml-2 gap-2" onClick={() => setShowPresence(true)}>
            <Bell className="h-4 w-4" /> الحسابات المفتوحة ({onlineUsers.length})
          </Button>}
          <Link
            href="/ovr-incident-report"
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
            title="إرسال بلاغ OVR"
          >
            <AlertTriangle className="h-4 w-4" />
            إرسال OVR
          </Link>
        </div>
        {children}
      </main>

      {/* Sonner toast (small, bottom-left, closable) */}
      <Toaster
        position="bottom-left"
        richColors
        closeButton
        duration={4000}
        toastOptions={{ className: "text-sm" }}
      />

      {/* PWA install prompt (Android/Windows banner + iOS instructions) */}
      <PwaInstallPrompt />
      <Dialog open={showPresence} onOpenChange={setShowPresence}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>الحسابات المفتوحة والنداء الصوتي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
              {onlineUsers.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حسابات متصلة الآن</p> : onlineUsers.map(u => <div key={u.name} className="flex items-center justify-between text-sm"><span>{u.name}</span><span className="text-green-600">متصل</span></div>)}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="notice-audience" checked={noticeAudience === "all_online"} onChange={() => setNoticeAudience("all_online")} /> إرسال إلى جميع المستخدمين المتصلين الآن</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="notice-audience" checked={noticeAudience === "selected"} onChange={() => setNoticeAudience("selected")} /> اختيار مستخدمين محددين</label>
            {noticeAudience === "selected" && <div className="grid grid-cols-2 gap-2 rounded-md border p-2 max-h-32 overflow-y-auto">{availableUsers.map(u => <label key={u.name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noticeRecipients.includes(u.name)} onChange={e => setNoticeRecipients(prev => e.target.checked ? [...prev, u.name] : prev.filter(n => n !== u.name))} />{u.name}{u.isOnline ? <span className="text-green-600">●</span> : <span className="text-muted-foreground">(غير متصل)</span>}</label>)}</div>}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="default" className="gap-2"><Megaphone className="h-4 w-4" /> رسالة مسجلة</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">النغمة<select className="h-9 w-full rounded-md border bg-background px-2" value={noticeTone} onChange={e => setNoticeTone(e.target.value)}><option value="single">نغمة واحدة</option><option value="double">نغمتان متتاليتان</option><option value="soft">نغمة هادئة</option></select></label>
              <label className="space-y-1 text-sm">المدة: {noticeToneDurationMs} مللي ثانية<input className="w-full" type="range" min="80" max="1000" step="20" value={noticeToneDurationMs} onChange={e => setNoticeToneDurationMs(Number(e.target.value))} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2 items-end">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noticeSpeak} onChange={e => setNoticeSpeak(e.target.checked)} /> قراءة الرسالة بصوت</label>
              <label className="space-y-1 text-sm">لغة الصوت<select className="h-9 w-full rounded-md border bg-background px-2" value={noticeSpeechLanguage} onChange={e => setNoticeSpeechLanguage(e.target.value as "auto" | "ar" | "en")}><option value="auto">تلقائي حسب النص</option><option value="ar">العربية</option><option value="en">English</option></select></label>
            </div>
            <div className="flex gap-2 items-center"><Button type="button" variant="secondary" onClick={() => speakNotification({ from: "المؤسس", message: noticeSpeechLanguage === "en" ? "This is a voice test" : "هذه تجربة للصوت والنغمة", delivery: noticeDelivery, tone: noticeTone, toneDurationMs: noticeToneDurationMs, speak: noticeSpeak ? 1 : 0, speechLanguage: noticeSpeechLanguage })}>تجربة النغمة والصوت</Button><p className="text-xs text-muted-foreground">العربية والإنجليزية تستخدمان أصوات الجهاز المثبتة محليًا.</p></div>
            <p className="text-xs text-muted-foreground">تصل الرسالة فورياً بتنبيه صوتي وإشعار سطح المكتب أو شاشة قفل الهاتف بعد السماح بالإشعارات.</p>
            <Input value={noticeText} onChange={e => setNoticeText(e.target.value)} placeholder="اكتب الرسالة التي سيقرأها الكمبيوتر" />
            <div className="rounded-md border p-2 max-h-40 overflow-y-auto space-y-2"><p className="text-xs font-semibold">سجل الرسائل المحفوظة</p>{noticeHistory.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد رسائل محفوظة</p> : noticeHistory.slice().reverse().map(n => <div key={n.id} className="border-t pt-1 text-xs"><p>{n.message}</p><p className="text-muted-foreground">إلى: {n.recipients.join("، ")}</p></div>)}</div>
          </div>
          <DialogFooter><Button disabled={!noticeText.trim() || (noticeAudience === "selected" && noticeRecipients.length === 0)} onClick={async () => { try { await apiPost("/api/notifications", { message: noticeText, delivery: "announcement", tone: noticeTone, toneDurationMs: noticeToneDurationMs, speak: noticeSpeak, speechLanguage: noticeSpeechLanguage, audience: noticeAudience, recipients: noticeRecipients }); setNoticeText(""); setNoticeRecipients([]); toast.success("تم إرسال الرسالة المسجلة"); } catch (e: any) { toast.error(e.message); } }}>إرسال الرسالة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              تأكيد تسجيل الخروج
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              هل تريد تسجيل الخروج من النظام؟
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">سبب الخروج</Label>
              <Select value={logoutReason} onValueChange={setLogoutReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGOUT_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmLogout} disabled={logout.isPending}>
              <LogOut className="h-4 w-4 ml-1" />
              {logout.isPending ? "جاري الخروج..." : "تأكيد الخروج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
