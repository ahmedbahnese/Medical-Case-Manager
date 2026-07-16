import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
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
  Clock,
  AlertTriangle,
  Settings,
  FileOutput,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

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
    ],
  },
  {
    label: "البحث والسجلات",
    items: [
      { name: "بحث متقدم", href: "/advanced-search", icon: Search },
      { name: "سجل الخروج", href: "/discharge-history", icon: History },
      { name: "سجل العمليات", href: "/audit-log", icon: FileOutput },
    ],
  },
  {
    label: "الإعدادات والأدوات",
    items: [
      { name: "الاستيراد الذكي", href: "/bulk-import", icon: Bot },
      { name: "نسخ احتياطي", href: "/backup", icon: Database },
      { name: "الإعدادات", href: "/settings", icon: Settings },
    ],
  },
];

// flat list for mobile nav
const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();

  if (isLoading) return <div className="h-screen bg-background" />;

  const handleLogout = () => {
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
          <Activity className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-bold text-lg leading-tight">BSCH</h1>
            <p className="text-xs text-sidebar-foreground/60">مستشفى الأطفال التخصصي بالبحيرة</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_GROUPS.map((group) => (
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
          <div className="flex items-center gap-3 px-2 py-1 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0) || "م"}
            </div>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground">{user?.name || "مستخدم النظام"}</p>
              <p className="text-xs text-sidebar-foreground/50">{user?.isFounder ? "مدير النظام" : "طاقم طبي"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleLogout}
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
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-sidebar-foreground/80">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden flex overflow-x-auto p-2 bg-sidebar/50 border-b border-sidebar-border no-print gap-1 shrink-0">
        {ALL_NAV.map((item) => {
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
    </div>
  );
}
