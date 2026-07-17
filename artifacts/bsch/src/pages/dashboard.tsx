import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetDashboardStats, useGetDepartments, useGetCases } from "@workspace/api-client-react";
import {
  Users, Activity, AlertTriangle, Clock, Wind, ArrowLeft, Plus,
  Download, FileSpreadsheet, Printer, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Bed
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LABELS, translate, calcStayLabel, formatDateAr } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useAppSettings } from "@/contexts/settings-context";

function exportCSV(cases: any[]) {
  const headers = ["م", "الاسم", "السن", "التشخيص", "تاريخ الدخول", "مدة الإقامة", "الوضع", "ت. التنفس"];
  const rows = cases.map((c, i) => [
    i + 1, c.patientName, c.age ?? "", c.diagnosis ?? "",
    formatDateAr(c.admissionDate), calcStayLabel(c.admissionDate),
    translate(c.status, LABELS.STATUS), translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `bsch-cases-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

function GroupCasesDialog({ deptIds, groupLabel, open, onClose }: {
  deptIds: number[]; groupLabel: string; open: boolean; onClose: () => void; groupKey: string;
}) {
  const { data: cases, isLoading } = useGetCases({ status: "active" } as any);
  const [fontSize, setFontSize] = useState([12]);
  const displayCases = (cases ?? []).filter((c: any) => deptIds.includes(c.departmentId));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>حالات {groupLabel} ({displayCases.length})</span>
            <div className="flex items-center gap-2 flex-wrap">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider value={fontSize} onValueChange={setFontSize} min={9} max={16} step={1}
                className="w-28" />
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
                  {["م", "الاسم", "السن", "التشخيص", "تاريخ الدخول", "مدة الإقامة", "الوضع", "ت. التنفس"].map(h => (
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
                    <td className="border p-2">{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
                  </tr>
                ))}
                {displayCases.length === 0 && (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">لا توجد حالات نشطة</td></tr>
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
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: departments, isLoading: deptLoading } = useGetDepartments();
  const { hospital_name } = useAppSettings();
  const [openGroup, setOpenGroup] = useState<{ key: string; label: string; deptIds: number[] } | null>(null);

  const isLoading = statsLoading || deptLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const deptStatMap = new Map(stats.departmentStats.map((d: any) => [d.departmentId, d]));

  // Build individual dept cards
  const deptCards = (departments ?? []).map(d => {
    const ds = deptStatMap.get(d.id) as any ?? { activeCases: 0, criticalCases: 0 };
    const pct = Math.round((ds.activeCases / d.capacity) * 100);
    const respCount = (stats as any).respirationByDept?.[d.id] ?? 0;
    return { ...d, activeCases: ds.activeCases, criticalCases: ds.criticalCases, pct };
  });

  // Group ventilation stats
  const respBreakdown = (stats as any).respirationBreakdown ?? [];

  // Group all depts for the dialog: each dept group
  const groupMap: Record<string, { label: string; deptIds: number[] }> = {};
  (departments ?? []).forEach(d => {
    const t = d.departmentType as string;
    const isInc = t.startsWith("incubator");
    const gKey = isInc ? "incubators" : t === "picu" ? "picu" : "icu";
    const gLabel = isInc ? "الحضانات" : t === "picu" ? "البيكو" : "العناية المركزة";
    if (!groupMap[gKey]) groupMap[gKey] = { label: gLabel, deptIds: [] };
    groupMap[gKey].deptIds.push(d.id);
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-bold">{hospital_name}</h1>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Button asChild size="sm" className="gap-1">
          <Link href="/add-case"><Plus className="h-4 w-4" /> إضافة حالة</Link>
        </Button>
      </div>

      {/* KPI strip — compact, side by side */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-t-4 border-t-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/print-reports")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg shrink-0">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">حالات نشطة</p>
              <p className="text-2xl font-bold text-blue-600">{stats.activeCases}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">حالات حرجة</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalCases}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-yellow-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/waiting-cases")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg shrink-0">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">قوائم الانتظار</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.waitingCases}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-teal-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/artificial-respiration")}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg shrink-0">
              <Wind className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">تنفس صناعي</p>
              <p className="text-2xl font-bold text-teal-600">{stats.artificialRespirationCases}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards — grid, all shown side by side */}
      <div>
        <div className="flex items-center justify-between mb-2 no-print">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">الأقسام</h2>
          <div className="flex gap-2">
            {Object.entries(groupMap).map(([k, g]) => (
              <Button key={k} size="sm" variant="outline" className="text-xs h-7 px-2"
                onClick={() => setOpenGroup({ key: k, label: g.label, deptIds: g.deptIds })}>
                بيان {g.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {deptCards.map(d => {
            const isOver = d.activeCases >= d.capacity;
            return (
              <Card key={d.id}
                className={`cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-t-4 ${
                  isOver ? "border-t-red-500" : d.pct >= 80 ? "border-t-yellow-400" : "border-t-green-500"
                }`}
                onClick={() => setLocation(`/departments/${d.id}`)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{translate(d.departmentType as string, LABELS.DEPARTMENT_TYPES)}</p>
                    </div>
                    <Badge variant={isOver ? "destructive" : "outline"} className="text-xs shrink-0">
                      {d.activeCases}/{d.capacity}
                    </Badge>
                  </div>

                  {/* Occupancy bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mb-2">
                    <div className={`h-full rounded-full transition-all ${
                      isOver ? "bg-destructive" : d.pct >= 80 ? "bg-yellow-400" : "bg-green-500"
                    }`} style={{ width: `${Math.min(100, d.pct)}%` }} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {d.criticalCases > 0 && (
                      <span className="flex items-center gap-0.5 text-red-500 font-medium">
                        <AlertTriangle className="h-3 w-3" /> {d.criticalCases} حرجة
                      </span>
                    )}
                    <span>{d.capacity - d.activeCases} شاغر</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ventilation breakdown */}
      {respBreakdown.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">توزيع التنفس الصناعي</h3>
              <Link href="/artificial-respiration" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                البيان الكامل <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {respBreakdown.map((item: any) => (
                <div key={item.type} className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background/50 text-xs">
                  <span className="font-medium">{translate(item.label ?? item.type, LABELS.ARTIFICIAL_RESPIRATION)}</span>
                  <Badge variant="secondary" className="text-xs h-4 px-1 font-bold">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group cases dialog */}
      {openGroup && (
        <GroupCasesDialog
          groupKey={openGroup.key}
          groupLabel={openGroup.label}
          deptIds={openGroup.deptIds}
          open
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}
