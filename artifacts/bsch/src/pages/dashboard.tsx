import { useState } from "react";
import { Link } from "wouter";
import { useGetDashboardStats, useGetDepartments, useGetCases } from "@workspace/api-client-react";
import {
  Users, Activity, AlertTriangle, Clock, Wind, ArrowLeft, Plus,
  Download, FileSpreadsheet, Printer, ChevronDown, ChevronUp, ZoomIn, ZoomOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LABELS, translate, calcStayLabel, formatDateAr } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const DEPT_GROUPS = [
  {
    key: "icu",
    label: "العناية المركزة",
    types: ["intensive_care_high", "intensive_care_medium"],
    color: "border-red-500/30 bg-red-500/5",
    accent: "text-red-400",
    barColor: "bg-red-400",
    totalCapacity: 16,
  },
  {
    key: "picu",
    label: "البيكيو (PICU)",
    types: ["picu"],
    color: "border-yellow-500/30 bg-yellow-500/5",
    accent: "text-yellow-400",
    barColor: "bg-yellow-400",
    totalCapacity: 12,
  },
  {
    key: "incubator",
    label: "الحضانات",
    types: ["incubator_a", "incubator_b", "incubator_c"],
    color: "border-teal-500/30 bg-teal-500/5",
    accent: "text-teal-400",
    barColor: "bg-teal-400",
    totalCapacity: 43,
  },
];

function exportCSV(cases: any[]) {
  const headers = ["الاسم", "السن", "التشخيص", "تاريخ الدخول", "مدة الإقامة", "الوضع", "تاريخ التنفس", "تاريخ الخروج", "MOBE"];
  const rows = cases.map(c => [
    c.patientName,
    c.age ?? "",
    c.diagnosis ?? "",
    formatDateAr(c.admissionDate),
    calcStayLabel(c.admissionDate),
    translate(c.status, LABELS.STATUS),
    formatDateAr(c.ventilationStartDate),
    formatDateAr(c.dischargeDate),
    c.mobe ?? "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bsch-cases-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface GroupCasesDialogProps {
  groupKey: string;
  groupLabel: string;
  deptIds: number[];
  open: boolean;
  onClose: () => void;
}

function GroupCasesDialog({ groupLabel, deptIds, open, onClose }: GroupCasesDialogProps) {
  const [fontSize, setFontSize] = useState([14]);
  const { data: cases, isLoading } = useGetCases({ status: "active" } as any);

  const filtered = cases?.filter(c => deptIds.includes(c.departmentId)) ?? [];
  const allCases = useGetCases({} as any).data?.filter(c => deptIds.includes(c.departmentId)) ?? [];

  const displayCases = filtered.length > 0 ? filtered : allCases;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>بيان حالات — {groupLabel}</span>
            <div className="flex items-center gap-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                min={10}
                max={20}
                step={1}
                className="w-28"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Button size="sm" variant="outline" className="gap-1" onClick={() => exportCSV(displayCases)}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> طباعة
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3].map(i=><Skeleton key={i} className="h-10"/>)}</div>
          ) : (
            <table className="w-full border-collapse text-sm" style={{ fontSize: fontSize[0] }}>
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {["م", "الاسم", "السن", "التشخيص", "تاريخ الدخول", "مدة الإقامة", "الوضع", "ت. التنفس", "ت. الخروج", "MOBE"].map(h => (
                    <th key={h} className="border p-2 text-right font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCases.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="border p-2 text-center">{i + 1}</td>
                    <td className="border p-2 font-medium">{c.patientName}</td>
                    <td className="border p-2">{c.age ?? "—"}</td>
                    <td className="border p-2">{c.diagnosis ?? "—"}</td>
                    <td className="border p-2">{formatDateAr(c.admissionDate)}</td>
                    <td className="border p-2 text-center">{calcStayLabel(c.admissionDate)}</td>
                    <td className="border p-2">
                      <Badge variant={c.status === "critical" ? "destructive" : "outline"} className="text-xs">
                        {translate(c.status, LABELS.STATUS)}
                      </Badge>
                    </td>
                    <td className="border p-2">{formatDateAr((c as any).ventilationStartDate)}</td>
                    <td className="border p-2">{formatDateAr(c.dischargeDate)}</td>
                    <td className="border p-2">{(c as any).mobe ?? "—"}</td>
                  </tr>
                ))}
                {displayCases.length === 0 && (
                  <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">لا توجد حالات نشطة</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: departments, isLoading: deptLoading } = useGetDepartments();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const isLoading = statsLoading || deptLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const deptTypeMap = new Map(departments?.map(d => [d.id, String(d.departmentType)]) ?? []);

  const groupStats = DEPT_GROUPS.map(g => {
    const deptStats = stats.departmentStats.filter(d =>
      g.types.includes(deptTypeMap.get(d.departmentId) ?? "")
    );
    const subDepts = departments?.filter(d => g.types.includes(d.departmentType as string)) ?? [];
    const deptIds = subDepts.map(d => d.id);
    const activeCases = deptStats.reduce((sum, d) => sum + d.activeCases, 0);
    const criticalCases = deptStats.reduce((sum, d) => sum + d.criticalCases, 0);
    const occupancy = Math.round((activeCases / g.totalCapacity) * 100);
    return { ...g, activeCases, criticalCases, occupancy, subDepts, deptStats, deptIds };
  });

  const openGroupData = openGroup ? groupStats.find(g => g.key === openGroup) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-0.5">مستشفى الأطفال التخصصي بالبحيرة</p>
        </div>
        <Button asChild className="gap-2 shrink-0" size="sm">
          <Link href="/add-case">
            <Plus className="h-4 w-4" /> إضافة حالة
          </Link>
        </Button>
      </div>

      {/* KPI Cards - compact */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">حالات نشطة</p>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.activeCases}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">حالات حرجة</p>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.criticalCases}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">قوائم الانتظار</p>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <Link href="/waiting-cases" className="text-2xl font-bold text-yellow-500 hover:underline block">
              {stats.waitingCases}
            </Link>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">تنفس صناعي</p>
              <Wind className="h-4 w-4 text-teal-500" />
            </div>
            <Link href="/artificial-respiration" className="text-2xl font-bold text-teal-500 hover:underline block">
              {stats.onRespiration}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 3 Department Groups */}
      <div className="grid gap-4 md:grid-cols-3">
        {groupStats.map(g => (
          <Card key={g.key} className={`border ${g.color} shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => setOpenGroup(g.key)}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-base font-bold ${g.accent}`}>{g.label}</CardTitle>
                {g.criticalCases > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse">{g.criticalCases} حرج</Badge>
                )}
              </div>
              <CardDescription className="text-xs">السعة: {g.totalCapacity} سرير • اضغط لعرض الحالات</CardDescription>
            </CardHeader>

            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{g.activeCases} حالة</span>
                  <span className={`font-bold ${g.accent}`}>{g.occupancy}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      g.occupancy >= 100 ? "bg-destructive" : g.occupancy >= 80 ? "bg-yellow-400" : g.barColor
                    }`}
                    style={{ width: `${Math.min(g.occupancy, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                {g.subDepts.map(sub => {
                  const subStat = g.deptStats.find(d => d.departmentId === sub.id);
                  const subActive = subStat?.activeCases ?? 0;
                  const subPct = Math.min(Math.round((subActive / sub.capacity) * 100), 100);
                  return (
                    <Link href={`/departments/${sub.id}`} key={sub.id}
                      className="block group"
                      onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="group-hover:text-primary transition-colors">{sub.name}</span>
                        <span className="text-muted-foreground">{subActive}/{sub.capacity}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div className={`h-full rounded-full ${subPct >= 100 ? "bg-destructive" : subPct >= 80 ? "bg-yellow-400" : g.barColor}`}
                          style={{ width: `${subPct}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Respiration breakdown - compact */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">توزيع التنفس الصناعي</h3>
            <Link href="/artificial-respiration" className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض البيان <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.respirationBreakdown.map((item) => (
              <div key={item.type} className="flex items-center justify-between p-2 rounded-lg border bg-background/50">
                <span className="text-xs font-medium">{translate(item.label, LABELS.ARTIFICIAL_RESPIRATION)}</span>
                <Badge variant="secondary" className="font-bold">{item.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Group cases dialog */}
      {openGroupData && (
        <GroupCasesDialog
          groupKey={openGroupData.key}
          groupLabel={openGroupData.label}
          deptIds={openGroupData.deptIds}
          open={!!openGroup}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}
