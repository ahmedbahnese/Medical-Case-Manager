import { Link } from "wouter";
import { useGetDashboardStats, useGetDepartments } from "@workspace/api-client-react";
import {
  Users,
  Activity,
  AlertTriangle,
  Clock,
  Wind,
  ArrowLeft,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LABELS, translate } from "@/lib/constants";

// 3 grouped department sections
const DEPT_GROUPS = [
  {
    key: "icu",
    label: "قسم العناية المركزة",
    shortLabel: "العناية",
    types: ["intensive_care_high", "intensive_care_medium"],
    color: "border-red-500/30 bg-red-500/5",
    accent: "text-red-400",
    barColor: "bg-red-400",
    totalCapacity: 16,
  },
  {
    key: "picu",
    label: "قسم البيكيو (PICU)",
    shortLabel: "البيكيو",
    types: ["picu"],
    color: "border-yellow-500/30 bg-yellow-500/5",
    accent: "text-yellow-400",
    barColor: "bg-yellow-400",
    totalCapacity: 12,
  },
  {
    key: "incubator",
    label: "قسم الحضانات",
    shortLabel: "الحضانات",
    types: ["incubator_a", "incubator_b", "incubator_c"],
    color: "border-teal-500/30 bg-teal-500/5",
    accent: "text-teal-400",
    barColor: "bg-teal-400",
    totalCapacity: 43,
  },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: departments, isLoading: deptLoading } = useGetDepartments();

  const isLoading = statsLoading || deptLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Build dept type map from departments list
  const deptTypeMap = new Map(departments?.map(d => [d.id, String(d.departmentType)]) ?? []);

  // Aggregate stats by group
  const groupStats = DEPT_GROUPS.map(g => {
    const deptStats = stats.departmentStats.filter(d =>
      g.types.includes(deptTypeMap.get(d.departmentId) ?? "")
    );
    const subDepts = departments?.filter(d => g.types.includes(d.departmentType as string)) ?? [];
    const activeCases = deptStats.reduce((sum, d) => sum + d.activeCases, 0);
    const criticalCases = deptStats.reduce((sum, d) => sum + d.criticalCases, 0);
    const capacity = g.totalCapacity;
    const occupancy = Math.round((activeCases / capacity) * 100);
    return { ...g, activeCases, criticalCases, capacity, occupancy, subDepts, deptStats };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">مستشفى الأطفال التخصصي بالبحيرة — نظرة عامة على الحالات</p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href="/add-case">
            <Plus className="h-4 w-4" /> إضافة حالة جديدة
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">حالات نشطة</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.activeCases}</div>
            <p className="text-xs text-muted-foreground mt-1">في الأقسام الثلاثة</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">حالات حرجة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.criticalCases}</div>
            <p className="text-xs text-muted-foreground mt-1">تتطلب انتباه فوري</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">قوائم الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.waitingCases}</div>
            <Link href="/waiting-cases" className="text-xs text-primary hover:underline mt-1 block">إدارة الانتظار</Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تنفس صناعي</CardTitle>
            <Wind className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-500">{stats.onRespiration}</div>
            <Link href="/artificial-respiration" className="text-xs text-primary hover:underline mt-1 block">عرض البيان</Link>
          </CardContent>
        </Card>
      </div>

      {/* 3 Department Groups */}
      <div className="grid gap-6 md:grid-cols-3">
        {groupStats.map(g => (
          <Card key={g.key} className={`border ${g.color} shadow-sm`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-lg font-bold ${g.accent}`}>{g.label}</CardTitle>
                {g.criticalCases > 0 && (
                  <Badge variant="destructive" className="animate-pulse">{g.criticalCases} حرج</Badge>
                )}
              </div>
              <CardDescription>إجمالي السعة: {g.capacity} سرير</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Total occupancy bar */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold">{g.activeCases} حالة نشطة</span>
                  <span className={`font-bold ${g.accent}`}>{g.occupancy}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      g.occupancy >= 100 ? "bg-destructive" : g.occupancy >= 80 ? "bg-warning" : g.barColor
                    }`}
                    style={{ width: `${Math.min(g.occupancy, 100)}%` }}
                  />
                </div>
              </div>

              {/* Sub-departments */}
              <div className="space-y-2">
                {g.subDepts.map(sub => {
                  const subStat = g.deptStats.find(d => d.departmentId === sub.id);
                  const subActive = subStat?.activeCases ?? 0;
                  const subPct = Math.min(Math.round((subActive / sub.capacity) * 100), 100);
                  return (
                    <Link href={`/departments/${sub.id}`} key={sub.id} className="block group">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="group-hover:text-primary transition-colors font-medium">{sub.name}</span>
                        <span className="text-muted-foreground">{subActive}/{sub.capacity}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${
                            subPct >= 100 ? "bg-destructive" : subPct >= 80 ? "bg-warning" : g.barColor
                          }`}
                          style={{ width: `${subPct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Link
                href={`/artificial-respiration?dept=${g.types[0]}`}
                className={`flex items-center justify-end text-xs ${g.accent} hover:underline`}
              >
                بيان التنفس الصناعي <ArrowLeft className="h-3 w-3 mr-1" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Respiration breakdown */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>توزيع حالات التنفس الصناعي</CardTitle>
          <CardDescription>تفصيل حسب نوع جهاز التنفس</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.respirationBreakdown.map((item) => (
              <div key={item.type} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Wind className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{translate(item.label, LABELS.ARTIFICIAL_RESPIRATION)}</span>
                </div>
                <Badge variant="secondary" className="font-bold text-sm px-3">{item.count}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Link href="/artificial-respiration" className="flex items-center text-sm text-primary font-medium hover:underline">
              عرض بيان التنفس الصناعي الكامل <ArrowLeft className="h-3 w-3 mr-1" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
