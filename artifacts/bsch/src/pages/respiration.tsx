import { useState } from "react";
import { useGetCasesOnRespiration, useGetDepartments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Wind, ArrowLeft, Activity, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LABELS, translate } from "@/lib/constants";

// Ventilation mode display labels (matches PDF terminology)
const MODE_LABELS: Record<string, { short: string; color: string }> = {
  vent:           { short: "M.V / PCV",    color: "text-red-400 border-red-400/40 bg-red-400/10" },
  high_frequency: { short: "H.F.O",        color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  cpap:           { short: "CPAP / HFNC",  color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  standby:        { short: "O₂ Mask / RA", color: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
};

function calcDuration(admissionDate: string | null | undefined): string {
  if (!admissionDate) return "—";
  const from = new Date(admissionDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - from.getTime()) / 86400000);
  if (days === 0) return "اليوم";
  return `${days} يوم`;
}

export default function RespirationList() {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const { data: departments } = useGetDepartments();

  const { data: allCases, isLoading } = useGetCasesOnRespiration();

  // Client-side department filter
  const cases = deptFilter === "all"
    ? allCases
    : allCases?.filter(c => c.departmentId === parseInt(deptFilter));

  // Group cards by department
  const DEPT_GROUPS = [
    {
      label: "قسم العناية المركزة",
      color: "border-red-500/30 bg-red-500/5",
      accent: "text-red-400",
      types: ["intensive_care_high", "intensive_care_medium"],
    },
    {
      label: "قسم البيكيو (PICU)",
      color: "border-yellow-500/30 bg-yellow-500/5",
      accent: "text-yellow-400",
      types: ["picu"],
    },
    {
      label: "قسم الحضانات",
      color: "border-teal-500/30 bg-teal-500/5",
      accent: "text-teal-400",
      types: ["incubator_a", "incubator_b", "incubator_c"],
    },
  ];

  // Count per dept group
  const deptTypeMap = new Map(departments?.map(d => [d.id, String(d.departmentType)]));
  const groupCounts = DEPT_GROUPS.map(g => ({
    ...g,
    count: cases?.filter(c => {
      const t = deptTypeMap.get(c.departmentId);
      return t && g.types.includes(t as string);
    }).length ?? 0,
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-teal-500/20 p-3 rounded-xl border border-teal-500/30">
            <Wind className="h-8 w-8 text-teal-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-teal-500">بيان حالات التنفس الصناعي</h1>
            <p className="text-muted-foreground mt-1">
              مستشفى الأطفال التخصصي — {cases?.length ?? 0} حالة على أجهزة التنفس
            </p>
          </div>
        </div>

        {/* Department filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="كل الأقسام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deptFilter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setDeptFilter("all")}>مسح</Button>
          )}
        </div>
      </div>

      {/* Summary cards — 3 grouped departments */}
      <div className="grid md:grid-cols-3 gap-4">
        {groupCounts.map(g => (
          <Card key={g.label} className={`border ${g.color}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${g.accent}`}>{g.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${g.accent}`}>{g.count}</div>
              <p className="text-xs text-muted-foreground mt-1">حالة على تنفس صناعي</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ventilation type breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(LABELS.ARTIFICIAL_RESPIRATION)
          .filter(([k]) => k !== "no")
          .map(([key, label]) => {
            const count = cases?.filter(c => c.artificialRespiration === key).length ?? 0;
            const mode = MODE_LABELS[key];
            return (
              <Card key={key} className={`border ${count > 0 ? mode?.color ?? "" : "opacity-50"}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">{mode?.short ?? label}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Main table — styled like the PDF */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b-2">
                  <TableHead className="font-bold">الاسم</TableHead>
                  <TableHead className="font-bold">السن</TableHead>
                  <TableHead className="font-bold">التشخيص</TableHead>
                  <TableHead className="font-bold">تاريخ الدخول</TableHead>
                  <TableHead className="font-bold">مدة الإقامة</TableHead>
                  <TableHead className="font-bold">نوع التنفس</TableHead>
                  <TableHead className="font-bold">القسم</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!cases || cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      لا يوجد أي مرضى على أجهزة تنفس صناعي
                      {deptFilter !== "all" ? " في هذا القسم" : " حالياً"}.
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.map((c, idx) => {
                    const mode = c.artificialRespiration ? MODE_LABELS[c.artificialRespiration] : null;
                    const admDate = c.admissionDate
                      ? new Date(c.admissionDate).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "2-digit" })
                      : "—";
                    return (
                      <TableRow key={c.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell className="font-semibold">{c.patientName}</TableCell>
                        <TableCell className="text-sm">{c.age ?? "—"}</TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          <span className="line-clamp-2">{c.diagnosis ?? "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{admDate}</TableCell>
                        <TableCell className="text-sm">{calcDuration(c.admissionDate?.toString())}</TableCell>
                        <TableCell>
                          {mode ? (
                            <Badge variant="outline" className={`font-bold px-2 py-0.5 text-xs ${mode.color}`}>
                              {mode.short}
                            </Badge>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <Link href={`/departments/${c.departmentId}`} className="text-primary hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                            <Activity className="h-3 w-3 shrink-0" />
                            {c.departmentName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/case/${c.id}`} className="inline-flex items-center text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-secondary/80 transition-colors whitespace-nowrap">
                            ملف المريض <ArrowLeft className="h-3 w-3 mr-1" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
