import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Bed, 
  Users, 
  ListPlus, 
  Search, 
  Printer, 
  Database,
  Menu,
  LogOut,
  Wind
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();

  if (isLoading) return <div className="h-screen bg-background" />;

  const navigation = [
    { name: "لوحة التحكم", href: "/dashboard", icon: Activity },
    { name: "إضافة حالة", href: "/add-case", icon: ListPlus },
    { name: "قوائم الانتظار", href: "/waiting-cases", icon: Users },
    { name: "التنفس الصناعي", href: "/artificial-respiration", icon: Wind },
    { name: "بحث متقدم", href: "/advanced-search", icon: Search },
    { name: "طباعة تقارير", href: "/print-reports", icon: Printer },
    { name: "نسخ احتياطي", href: "/backup", icon: Database },
  ];

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-l border-sidebar-border h-screen sticky top-0 no-print">
        <div className="p-4 md:p-6 flex items-center gap-3 text-sidebar-foreground border-b border-sidebar-border">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-bold text-lg leading-tight">BSCH</h1>
            <p className="text-xs text-sidebar-foreground/70">مستشفى الأطفال التخصصي</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0) || "م"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{user?.name || "مستخدم النظام"}</span>
              <span className="text-xs text-sidebar-foreground/60">{user?.isFounder ? "مؤسس" : "طبيب"}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border sticky top-0 z-10 no-print">
        <div className="flex items-center gap-2 text-sidebar-foreground">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-lg">BSCH</h1>
        </div>
        {/* Simple mobile menu could go here, for now just show logout */}
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-sidebar-foreground/80">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile Nav links basic implementation */}
      <nav className="md:hidden flex overflow-x-auto p-2 bg-sidebar/50 border-b border-sidebar-border no-print gap-2">
        {navigation.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex whitespace-nowrap items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>

      <main className="flex-1 overflow-x-hidden p-4 md:p-8 bg-background relative w-full">
        {children}
      </main>
    </div>
  );
}
