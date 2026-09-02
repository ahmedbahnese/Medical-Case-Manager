import { ReactNode, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PwaInstallPrompt, useSwUpdateToast } from "@/components/pwa-install-prompt";

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
      return (pp?.access ?? "edit") as "none" | "view" | "edit";
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
        <div className="mb-4 flex justify-end no-print">
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
