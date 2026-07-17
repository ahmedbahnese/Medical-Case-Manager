import { useState, useCallback, useEffect } from "react";
import { useGetDepartments, useUpdateCase } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Wind, ArrowLeft, Activity, Printer, FileSpreadsheet, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { exportWordDoc } from "@/lib/word-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LABELS, translate, formatDateAr, toInputDate } from "@/lib/constants";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

const MODE_LABELS: Record<string, { short: string; color: string }> = {
  high_frequency: { short: "H.F.O",            color: "text-orange-600 border-orange-300 bg-orange-50" },
  vent:           { short: "VENT / PCV",        color: "text-red-600 border-red-300 bg-red-50" },
  cpap:           { short: "CPAP",              color: "text-yellow-600 border-yellow-300 bg-yellow-50" },
  standby:        { short: "Standby",           color: "text-blue-600 border-blue-300 bg-blue-50" },
  hfnc:           { short: "HFNC",             color: "text-purple-600 border-purple-300 bg-purple-50" },
  box:            { short: "Box / نيزل كانيولا", color: "text-teal-600 border-teal-300 bg-teal-50" },
  no:             { short: "هواء الغرفة",       color: "text-gray-500 border-gray-300 bg-gray-50" },
};

const RESP_OPTIONS = [
  { value: "high_frequency", label: "تردد عالي (HFO)" },
  { value: "vent",           label: "فنت (VENT)" },
  { value: "cpap",           label: "سباب (CPAP)" },
  { value: "standby",        label: "استاندباي" },
  { value: "hfnc",           label: "HFNC" },
  { value: "box",            label: "بوكس / نيزل كانيولا" },
  { value: "no",             label: "هواء الغرفة" },
];

const DEPT_GROUPS = [
  { key: "icu",  label: "العناية المركزة", types: ["intensive_care_high","intensive_care_medium"], color: "bg-red-50 border-red-200" },
  { key: "picu", label: "البيكيو (PICU)",  types: ["picu"],                                       color: "bg-yellow-50 border-yellow-200" },
  { key: "inc",  label: "الحضانات",        types: ["incubator_a","incubator_b","incubator_c"],    color: "bg-teal-50 border-teal-200" },
];

const DAYS_AR = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function calcDuration(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days === 0 ? "اليوم" : `${days} يوم`;
}

interface Case {
  id: number;
  patientName: string;
  age?: string | null;
  diagnosis?: string | null;
  departmentId: number;
  departmentName?: string | null;
  admissionDate?: string | Date | null;
  artificialRespiration?: string | null;
  ventilationStartDate?: string | Date | null;
  ventilationEndDate?: string | Date | null;
  mobe?: string | null;
}

function InlineDateCell({ caseId, field, value, onSaved }: {
  caseId: number; field: "ventilationStartDate"|"ventilationEndDate";
  value: string | Date | null | undefined;
  onSaved: (id: number, f: string, v: string | null) => void;
}) {
  const updateCase = useUpdateCase();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(toInputDate(value));

  const save = useCallback((v: string) => {
    updateCase.mutate({ id: caseId, data: { [field]: v || null } as any }, {
      onSuccess: () => { onSaved(caseId, field, v || null); toast.success("تم الحفظ"); },
      onError: () => toast.error("فشل الحفظ"),
    });
    setEditing(false);
  }, [caseId, field, updateCase, onSaved]);

  if (editing) {
    return (
      <input type="date" autoFocus className="border rounded px-1 text-xs w-28"
        value={local} onChange={e => setLocal(e.target.value)}
        onBlur={() => save(local)}
        onKeyDown={e => { if (e.key==="Enter") save(local); if (e.key==="Escape") setEditing(false); }}
      />
    );
  }
  return (
    <span className="cursor-pointer hover:bg-blue-50 px-1 rounded text-xs whitespace-nowrap" title="اضغط للتعديل"
      onClick={() => { setLocal(toInputDate(value)); setEditing(true); }}>
      {formatDateAr(value) || <span className="text-gray-400">—</span>}
    </span>
  );
}

function InlineModeCell({ caseId, value, onSaved }: {
  caseId: number; value: string | null | undefined;
  onSaved: (id: number, f: string, v: string | null) => void;
}) {
  const updateCase = useUpdateCase();
  const [editing, setEditing] = useState(false);

  const save = (v: string) => {
    updateCase.mutate({ id: caseId, data: { artificialRespiration: v as any } }, {
      onSuccess: () => { onSaved(caseId, "artificialRespiration", v); toast.success("تم الحفظ"); },
      onError: () => toast.error("فشل الحفظ"),
    });
    setEditing(false);
  };

  const mode = MODE_LABELS[value ?? "no"];
  if (editing) {
    return (
      <Select defaultValue={value ?? "no"} onValueChange={save}>
        <SelectTrigger className="h-6 text-xs w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RESP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Badge variant="outline" className={`cursor-pointer font-bold text-xs ${mode?.color ?? ""}`} title="اضغط للتعديل" onClick={() => setEditing(true)}>
      {mode?.short ?? translate(value ?? "no", LABELS.ARTIFICIAL_RESPIRATION)}
    </Badge>
  );
}

function exportWord(cases: Case[], depts: {id:number;name:string}[]) {
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));
  const fa = (v: unknown) => formatDateAr((v as string) ?? null);
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
  const rows = cases.map((c, i) => `
    <tr style="${i%2===0?'':'background:#f5f5f5'}">
      <td style="text-align:center">${i+1}</td>
      <td><strong>${c.patientName}</strong></td>
      <td>${c.age ?? "—"}</td>
      <td>${c.diagnosis ?? "—"}</td>
      <td>${fa(c.admissionDate)}</td>
      <td>${calcDuration(c.admissionDate as string)}</td>
      <td>${fa(c.ventilationStartDate)}</td>
      <td>${fa(c.ventilationEndDate)}</td>
      <td>${translate(c.artificialRespiration ?? "no", LABELS.ARTIFICIAL_RESPIRATION)}</td>
      <td>${deptMap.get(c.departmentId) ?? "—"}</td>
    </tr>`).join("");
  const html = `
    <div class="header">
      <h2>مستشفى الأطفال التخصصي بالبحيرة — BSCH</h2>
      <h3>بيان حالات التنفس الصناعي</h3>
      <p>${dateStr} — إجمالي: ${cases.length} حالة</p>
    </div>
    <table border="1">
      <tr style="background:#d9e1f2">
        <th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th>
        <th>تاريخ الدخول</th><th>المدة</th><th>ت. التنفس</th>
        <th>ت. الفصل</th><th>Mode</th><th>القسم</th>
      </tr>
      ${rows}
    </table>`;
  exportWordDoc(html, `respiration-${now.toISOString().slice(0,10)}.doc`);
}

function exportExcel(cases: Case[], depts: any[]) {
  const deptMap = new Map(depts.map(d => [d.id, d.name]));
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
  const headers = ["م","الاسم","السن","التشخيص","تاريخ الدخول","مدة الإقامة","ت. التنفس","ت. فصل التنفس","Mode","القسم"];
  const rows = cases.map((c, i) => [
    i+1, c.patientName, c.age??"", c.diagnosis??"",
    formatDateAr(c.admissionDate), calcDuration(c.admissionDate as string),
    formatDateAr(c.ventilationStartDate), formatDateAr(c.ventilationEndDate),
    translate(c.artificialRespiration ?? "no", LABELS.ARTIFICIAL_RESPIRATION),
    deptMap.get(c.departmentId) ?? "",
  ]);
  const info = [
    [`بيان حالات التنفس الصناعي — ${dateStr}`],
    [`إجمالي الحالات: ${cases.length}`],
    [],
  ];
  const allRows = [...info, headers, ...rows];
  const tsv = allRows.map(r => (Array.isArray(r)?r:[r]).join("\t")).join("\n");
  const blob = new Blob(["\uFEFF"+tsv], { type: "text/tab-separated-values;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`respiration-${now.toISOString().slice(0,10)}.xls`; a.click();
  URL.revokeObjectURL(url);
}

export default function RespirationList() {
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState([12]);
  const [allCases, setAllCases] = useState<Case[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [localEdits, setLocalEdits] = useState<Record<number, Record<string, any>>>({});

  const { data: departments } = useGetDepartments();
  const depts = departments ?? [];

  // Load respiration cases via plain fetch (supports no filter)
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Case[]>("/api/cases/respiration");
      setAllCases(data);
    } catch { toast.error("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  }, []);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  const handleLocalEdit = (caseId: number, field: string, value: any) => {
    setLocalEdits(prev => ({ ...prev, [caseId]: { ...(prev[caseId]??{}), [field]: value } }));
  };

  const toggleDept = (id: number) => setSelectedDeptIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleGroup = (types: string[]) => {
    const ids = depts.filter(d=>types.includes(d.departmentType)).map(d=>d.id);
    const allSel = ids.every(id=>selectedDeptIds.has(id));
    setSelectedDeptIds(prev => { const n=new Set(prev); allSel?ids.forEach(id=>n.delete(id)):ids.forEach(id=>n.add(id)); return n; });
  };

  const deptTypeMap = new Map(depts.map(d=>[d.id, d.departmentType as string]));

  const cases = (allCases ?? [])
    .filter(c => selectedDeptIds.size === 0 || selectedDeptIds.has(c.departmentId))
    .map(c => ({ ...c, ...(localEdits[c.id]??{}) }));

  // Group summary
  const groupCounts = DEPT_GROUPS.map(g => ({
    ...g,
    count: cases.filter(c => { const t=deptTypeMap.get(c.departmentId); return t && g.types.includes(t); }).length,
  }));

  const now = new Date();
  const dateStr = `يوم ${DAYS_AR[now.getDay()]} ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-teal-100 p-3 rounded-xl border border-teal-200">
            <Wind className="h-7 w-7 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-700">بيان حالات التنفس الصناعي</h1>
            <p className="text-muted-foreground text-sm">{cases.length} حالة — {dateStr}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap no-print">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportExcel(cases, depts)}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportWord(cases, depts)}>
            <FileText className="h-4 w-4" /> Word
          </Button>
          <Button size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>
      </div>

      {/* Dept selection + font */}
      <div className="no-print grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">اختيار الأقسام <span className="text-muted-foreground font-normal">(فارغ = الكل)</span></CardTitle>
          </CardHeader>
          <CardContent className="pb-3 space-y-2">
            {DEPT_GROUPS.map(g => {
              const gDepts = depts.filter(d => g.types.includes(d.departmentType));
              const allSel = gDepts.length > 0 && gDepts.every(d => selectedDeptIds.has(d.id));
              return (
                <div key={g.key} className={`p-2 rounded border ${g.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox checked={allSel} onCheckedChange={() => toggleGroup(g.types)} id={`rg-${g.key}`} />
                    <label htmlFor={`rg-${g.key}`} className="text-xs font-semibold cursor-pointer">{g.label}</label>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pr-5">
                    {gDepts.map(d => (
                      <div key={d.id} className="flex items-center gap-1">
                        <Checkbox checked={selectedDeptIds.has(d.id)} onCheckedChange={() => toggleDept(d.id)} id={`rd-${d.id}`} />
                        <label htmlFor={`rd-${d.id}`} className="text-xs cursor-pointer">{d.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {/* Group counts */}
          <div className="grid grid-cols-3 gap-2">
            {groupCounts.map(g => (
              <Card key={g.key} className={`${g.color} border`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{g.count}</p>
                  <p className="text-xs text-muted-foreground">{g.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Font size */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground mb-2">حجم الخط ({fontSize[0]}px)</p>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider value={fontSize} onValueChange={setFontSize} min={9} max={18} step={1} className="flex-1" />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table — hidden on print (print-area below handles it) */}
      <Card className="no-print">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          ) : (
            <Table style={{ fontSize: fontSize[0] }}>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-right font-bold whitespace-nowrap">الاسم</TableHead>
                  <TableHead className="text-right whitespace-nowrap">السن</TableHead>
                  <TableHead className="text-right">التشخيص</TableHead>
                  <TableHead className="text-right whitespace-nowrap">تاريخ الدخول</TableHead>
                  <TableHead className="text-right whitespace-nowrap">المدة</TableHead>
                  <TableHead className="text-right whitespace-nowrap">ت. التنفس</TableHead>
                  <TableHead className="text-right whitespace-nowrap">ت. الفصل</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Mode</TableHead>
                  <TableHead className="text-right whitespace-nowrap">القسم</TableHead>
                  <TableHead className="text-right whitespace-nowrap">الملف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                      لا يوجد مرضى على أجهزة تنفس صناعي{selectedDeptIds.size > 0 ? " في الأقسام المختارة" : ""}.
                    </TableCell>
                  </TableRow>
                ) : cases.map((c, idx) => (
                  <TableRow key={c.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <TableCell className="font-semibold">{c.patientName}</TableCell>
                    <TableCell className="text-sm">{c.age ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-[160px]"><span className="line-clamp-2">{c.diagnosis ?? "—"}</span></TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatDateAr(c.admissionDate)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{calcDuration(c.admissionDate as string)}</TableCell>
                    <TableCell>
                      <InlineDateCell caseId={c.id} field="ventilationStartDate" value={c.ventilationStartDate} onSaved={handleLocalEdit} />
                    </TableCell>
                    <TableCell>
                      <InlineDateCell caseId={c.id} field="ventilationEndDate" value={c.ventilationEndDate} onSaved={handleLocalEdit} />
                    </TableCell>
                    <TableCell>
                      <InlineModeCell caseId={c.id} value={c.artificialRespiration} onSaved={handleLocalEdit} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/departments/${c.departmentId}`} className="text-primary hover:underline text-xs flex items-center gap-1 whitespace-nowrap">
                        <Activity className="h-3 w-3" />{c.departmentName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/case/${c.id}`} className="inline-flex items-center text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded hover:bg-secondary/80 whitespace-nowrap">
                        ملف <ArrowLeft className="h-3 w-3 mr-1" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Print area */}
      <div className="print-area hidden">
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <h2 className="font-bold text-lg">مستشفى الأطفال التخصصي بالبحيرة — BSCH</h2>
          <h3 className="font-bold">بيان حالات التنفس الصناعي</h3>
          <p className="text-sm">{dateStr} — إجمالي: {cases.length} حالة</p>
        </div>
        <table className="w-full border-collapse" style={{ fontSize: fontSize[0] }}>
          <thead>
            <tr className="bg-gray-200">
              {["م","الاسم","السن","التشخيص","تاريخ الدخول","المدة","ت. التنفس","ت. الفصل","Mode","القسم"].map(h=>(
                <th key={h} className="border border-gray-600 p-1 text-right font-bold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c,i)=>(
              <tr key={c.id} className={i%2===0?"":"bg-gray-50"}>
                <td className="border border-gray-400 p-1 text-center">{i+1}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap">{c.patientName}</td>
                <td className="border border-gray-400 p-1">{c.age??"—"}</td>
                <td className="border border-gray-400 p-1">{c.diagnosis??"—"}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap">{formatDateAr(c.admissionDate)}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap">{calcDuration(c.admissionDate as string)}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap">{formatDateAr(c.ventilationStartDate)}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap">{formatDateAr(c.ventilationEndDate)}</td>
                <td className="border border-gray-400 p-1 whitespace-nowrap">{translate(c.artificialRespiration??"no",LABELS.ARTIFICIAL_RESPIRATION)}</td>
                <td className="border border-gray-400 p-1">{c.departmentName??"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-center text-xs text-gray-500 mt-3 border-t pt-2">
          نظام BSCH — طُبع بتاريخ {new Date().toLocaleString("ar-EG")}
        </div>
      </div>
    </div>
  );
}
