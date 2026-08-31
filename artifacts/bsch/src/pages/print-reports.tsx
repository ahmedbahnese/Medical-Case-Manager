import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  useGetCases, useGetDepartments, useGetWaitingCases, useUpdateCase,
} from "@workspace/api-client-react";
import { Printer, ZoomIn, ZoomOut, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { exportWordDoc } from "@/lib/word-export";
import { exportPDF } from "@/lib/pdf-export";
import { useAppSettings } from "@/contexts/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABELS, translate, calcStayLabel, formatDateAr, getBedType, toInputDate } from "@/lib/constants";
import { toast } from "sonner";
import { ReportWatermark } from "@/components/report-watermark";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const FIXED_DEPT_GROUPS = [
  { key: "icu",      label: "العناية المركزة", types: ["intensive_care_high", "intensive_care_medium"] },
  { key: "picu",     label: "البيكيو (PICU)",  types: ["picu"] },
  { key: "inc",      label: "الحضانات",         types: ["incubator_a", "incubator_b", "incubator_c"] },
  { key: "internal", label: "الداخلي",          types: ["internal"] },
];

// All known fixed types — departments with other types go into a dynamic "أخرى" group
const FIXED_TYPES = new Set(FIXED_DEPT_GROUPS.flatMap(g => g.types));

const RESP_OPTIONS = [
  { value: "high_frequency", label: "تردد عالي (HFO)" },
  { value: "vent",           label: "فنت (VENT)" },
  { value: "cpap",           label: "سباب (CPAP)" },
  { value: "standby",        label: "استاندباي" },
  { value: "hfnc",           label: "HFNC" },
  { value: "box",            label: "بوكس / نيزل كانيولا" },
  { value: "no",             label: "هواء الغرفة" },
];

function exportExcel(
  cases: any[], depts: any[], selectedIds: Set<number>,
  reportDate: string, reportTime: string, reportAmPm: string,
  _waitingServo: any[] | undefined, _waitingReception: any[] | undefined,
  _includeServo: boolean, _includeReception: boolean,
  hospitalName: string,
) {
  const dateObj = new Date(reportDate + "T12:00:00");
  const dayName = DAYS_AR[dateObj.getDay()];
  const formatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
  const selectedDepts = depts.filter(d => selectedIds.has(d.id));
  const deptNames = selectedDepts.map(d => d.name).join(" + ") || "جميع الأقسام";
  const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  const deptMap = new Map(depts.map(d => [d.id, d]));
  const totalBeds = selectedDepts.reduce((sum, d) => sum + (Number(d.capacity) || 0), 0);
  const occupiedBeds = cases.length;
  const emptyBeds = Math.max(totalBeds - occupiedBeds, 0);
  const ventilated = cases.filter(c => c.artificialRespiration && c.artificialRespiration !== "no");
  const standby = cases.filter(c => c.artificialRespiration === "standby").length;

  const caseRows = cases.map((c, i) => {
    const dept = deptMap.get(c.departmentId);
    const device = c.mobe || c.deviceName || "";
    return `<tr class="data-row ${i % 2 ? "alt" : ""}">
      <td class="center">${i + 1}</td>
      <td>${esc(c.patientName)}</td>
      <td>${esc(c.diagnosis || "")}</td>
      <td class="center">${esc(formatDateAr(c.admissionDate))}</td>
      <td class="center">${esc(formatDateAr(c.ventilationStartDate))}</td>
      <td class="center">${esc(translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION))}</td>
      <td>${esc(device || (dept ? getBedType(dept.departmentType) : ""))}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>
@page { size: A4 landscape; margin: 0.5cm; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; font-size: 11pt; color: #000; }
.title { text-align: center; font-weight: bold; font-size: 14pt; }
.subtitle { text-align: center; font-size: 12pt; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
td, th { border: 1px solid #000; padding: 5px 6px; vertical-align: middle; text-align: center; }
.summary th { background: #d9e1f2; font-weight: bold; font-size: 11pt; }
.summary td { font-weight: bold; font-size: 11pt; }
.report th { background: #c6d9f0; font-weight: bold; white-space: normal; }
.report td { text-align: right; }
.report .center { text-align: center; }
.report .alt td { background: #f5f5f5; }
.signature { border: 0; text-align: center; font-weight: bold; font-size: 13pt; padding-top: 18pt; }
</style></head><body>
<table class="summary">
  <tr><td colspan="7" style="border:0;text-align:right;font-weight:bold;font-size:12pt">محافظة البحيرة</td></tr>
  <tr><td colspan="7" style="border:0;text-align:right;font-weight:bold">مديرية الشئون الصحية</td></tr>
  <tr><td colspan="7" class="title">${esc(hospitalName)}</td></tr>
  <tr><td colspan="7" class="subtitle">بيان التنفس الصناعي والحضانات — ${esc(dayName)} الموافق ${esc(formatted)} — ${esc(reportTime)} ${esc(reportAmPm)}</td></tr>
  <tr><th>البيان</th><th>الإجمالي</th><th>مشغول</th><th>معطل</th><th>ستاند باي</th><th>فارغ</th><th>الأقسام</th></tr>
  <tr><td>عدد الحضانات / الأسرة</td><td>${totalBeds}</td><td>${occupiedBeds}</td><td>0</td><td>${standby}</td><td>${emptyBeds}</td><td>${esc(deptNames)}</td></tr>
  <tr><td>عدد الحالات على التنفس الصناعي</td><td>${ventilated.length}</td><td>${ventilated.length}</td><td>0</td><td>${standby}</td><td>0</td><td>${esc(deptNames)}</td></tr>
</table>
<br/>
<table class="report">
  <colgroup><col style="width:6%"><col style="width:20%"><col style="width:16%"><col style="width:12%"><col style="width:14%"><col style="width:14%"><col style="width:18%"></colgroup>
  <tr><th>م</th><th>اسم الحالة</th><th>التشخيص</th><th>تاريخ الدخول</th><th>تاريخ الوضع على تنفس صناعي</th><th>وضعية جهاز التنفس الصناعي اليوم (mode)</th><th>اسم الجهاز أو نوعه</th></tr>
  ${caseRows || '<tr><td colspan="7">لا توجد حالات</td></tr>'}
</table>
<table><tr><td colspan="7" class="signature">مسئول الحضانات</td></tr></table>
</body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `بيان-التنفس-الصناعي-${reportDate}.xls`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

interface InlineCellProps {
  caseId: number;
  field: "ventilationStartDate" | "ventilationEndDate" | "artificialRespiration";
  value: string | null | undefined;
  onSaved: (caseId: number, field: string, value: string | null) => void;
}

function InlineDateCell({ caseId, field, value, onSaved }: InlineCellProps) {
  const updateCase = useUpdateCase();
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(toInputDate(value));

  const save = useCallback((val: string) => {
    const newVal = val || null;
    updateCase.mutate(
      { id: caseId, data: { [field]: newVal } as any },
      {
        onSuccess: () => {
          onSaved(caseId, field, newVal);
          toast.success("تم الحفظ");
        },
        onError: () => toast.error("فشل الحفظ"),
      }
    );
    setEditing(false);
  }, [caseId, field, updateCase, onSaved]);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        className="border rounded px-1 text-xs w-28"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => save(localVal)}
        onKeyDown={e => { if (e.key === "Enter") save(localVal); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }
  return (
    <span
      className="cursor-pointer hover:bg-blue-50 px-1 rounded border border-transparent hover:border-blue-200 text-xs whitespace-nowrap"
      title="اضغط للتعديل"
      onClick={() => { setLocalVal(toInputDate(value)); setEditing(true); }}
    >
      {formatDateAr(value) || <span className="text-gray-400">—</span>}
    </span>
  );
}

function InlineModeCell({ caseId, value, onSaved }: { caseId: number; value: string | null | undefined; onSaved: (id: number, f: string, v: string | null) => void }) {
  const updateCase = useUpdateCase();
  const [editing, setEditing] = useState(false);

  const save = (val: string) => {
    updateCase.mutate(
      { id: caseId, data: { artificialRespiration: val as any } },
      {
        onSuccess: () => { onSaved(caseId, "artificialRespiration", val); toast.success("تم الحفظ"); },
        onError: () => toast.error("فشل الحفظ"),
      }
    );
    setEditing(false);
  };

  if (editing) {
    return (
      <Select defaultValue={value ?? "no"} onValueChange={save}>
        <SelectTrigger className="h-6 text-xs w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESP_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <span
      className="cursor-pointer hover:bg-blue-50 px-1 rounded border border-transparent hover:border-blue-200 text-xs whitespace-nowrap"
      title="اضغط للتعديل"
      onClick={() => setEditing(true)}
    >
      {translate(value ?? "no", LABELS.ARTIFICIAL_RESPIRATION)}
    </span>
  );
}

export default function PrintReports() {
  const now = new Date();
  const { hospital_name, logo_base64, watermark_enabled } = useAppSettings();
  const [reportDate, setReportDate] = useState(now.toISOString().slice(0, 10));
  const [reportTime, setReportTime] = useState(format(now, "hh:mm"));
  const [reportAmPm, setReportAmPm] = useState<"ص" | "م">(parseInt(format(now, "HH")) < 12 ? "ص" : "م");
  const [fontSize, setFontSize] = useState([11]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());
  // Track inline edits locally so table reflects changes without full refetch
  const [localEdits, setLocalEdits] = useState<Record<number, Record<string, any>>>({});
  const [includeServo, setIncludeServo] = useState(false);
  const [includeReception, setIncludeReception] = useState(false);

  const { data: departments } = useGetDepartments();
  const { data: allCases, refetch } = useGetCases({ status: "active" } as any);
  const { data: waitingServo } = useGetWaitingCases({ section: "servo", status: "waiting" } as any);
  const { data: waitingReception } = useGetWaitingCases({ section: "reception", status: "waiting" } as any);

  const depts = departments ?? [];
  const deptTypeMap = new Map(depts.map(d => [d.id, d.departmentType as string]));
  const deptNameMap = new Map(depts.map(d => [d.id, d.name]));

  // Toggle individual dept
  const toggleDept = (id: number) => {
    setSelectedDeptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Toggle whole group
  const toggleGroup = (groupTypes: string[]) => {
    const groupDeptIds = depts.filter(d => groupTypes.includes(d.departmentType)).map(d => d.id);
    const allSelected = groupDeptIds.every(id => selectedDeptIds.has(id));
    setSelectedDeptIds(prev => {
      const next = new Set(prev);
      if (allSelected) groupDeptIds.forEach(id => next.delete(id));
      else groupDeptIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelectedDeptIds(new Set(depts.map(d => d.id)));
  const selectNone = () => setSelectedDeptIds(new Set());

  // Filter cases — empty when no department selected (avoid accidental "show all")
  const filteredCases = selectedDeptIds.size === 0
    ? []
    : (allCases ?? []).filter(c => selectedDeptIds.has(c.departmentId))
        .map(c => ({ ...c, ...(localEdits[c.id] ?? {}) }));

  const handleLocalEdit = (caseId: number, field: string, value: any) => {
    setLocalEdits(prev => ({ ...prev, [caseId]: { ...(prev[caseId] ?? {}), [field]: value } }));
  };

  const dateObj = new Date(reportDate + "T12:00:00");
  const dayName = DAYS_AR[dateObj.getDay()];
  const formatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

  const selectedDeptNames = selectedDeptIds.size === 0
    ? "جميع الأقسام"
    : depts.filter(d => selectedDeptIds.has(d.id)).map(d => d.name).join(" + ");

  const handlePrint = () => window.print();

  const buildReportHtml = () => {
    const deptTypeMap2 = new Map(depts.map((d: any) => [d.id as number, (d.departmentType ?? "") as string]));
    const fa = (v: unknown) => formatDateAr((v as string) ?? null);
    const rows = filteredCases.map((c: any, i: number) => {
      const bedType = getBedType(deptTypeMap2.get(c.departmentId as number) ?? "");
      return `<tr style="${i%2===0?'':'background:#f5f5f5'}">
        <td style="text-align:center">${i+1}</td>
        <td><strong>${c.patientName}</strong></td>
        <td>${c.age ?? "—"}</td>
        <td>${c.diagnosis ?? "—"}</td>
        <td>${fa(c.admissionDate)}</td>
        <td>${calcStayLabel(c.admissionDate as string)}</td>
        <td>${bedType}</td>
        <td>${fa(c.ventilationStartDate)}</td>
        <td>${fa(c.ventilationEndDate)}</td>
        <td>${translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
      </tr>`;
    }).join("");
    let html = `
      <div class="header">
        <h2>${hospital_name}</h2>
        <h3>بيان الحالات اليومي</h3>
        <p>القسم: ${selectedDeptNames}</p>
        <p>يوم ${dayName} الموافق ${formatted} — الساعة ${reportTime} ${reportAmPm} — عدد الحالات: ${filteredCases.length}</p>
      </div>
      <table border="1">
        <tr style="background:#d9e1f2"><th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th>
        <th>تاريخ الدخول</th><th>مدة الإقامة</th><th>سرير/محضن</th>
        <th>ت. التنفس</th><th>ت. الفصل</th><th>مود</th></tr>
        ${rows}
      </table>`;
    if (includeServo && (waitingServo?.length ?? 0) > 0) {
      const wrows = (waitingServo as any[]).map((c, i) => `<tr style="${i%2===0?'':'background:#f5f5f5'}">
        <td style="text-align:center">${i+1}</td><td>${c.patientName}</td><td>${c.age ?? "—"}</td>
        <td>${c.diagnosis ?? "—"}</td><td>${translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
        <td>${translate(c.careType, LABELS.CARE_TYPES)}</td></tr>`).join("");
      html += `<h4>سيرفو — قائمة الانتظار (${waitingServo!.length} حالة)</h4>
        <table border="1"><tr style="background:#d9e1f2"><th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th><th>التنفس</th><th>نوع الرعاية</th></tr>${wrows}</table>`;
    }
    if (includeReception && (waitingReception?.length ?? 0) > 0) {
      const wrows = (waitingReception as any[]).map((c, i) => `<tr style="${i%2===0?'':'background:#f5f5f5'}">
        <td style="text-align:center">${i+1}</td><td>${c.patientName}</td><td>${c.age ?? "—"}</td>
        <td>${c.diagnosis ?? "—"}</td><td>${translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
        <td>${translate(c.careType, LABELS.CARE_TYPES)}</td></tr>`).join("");
      html += `<h4>استقبال — قائمة الانتظار (${waitingReception!.length} حالة)</h4>
        <table border="1"><tr style="background:#d9e1f2"><th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th><th>التنفس</th><th>نوع الرعاية</th></tr>${wrows}</table>`;
    }
    return html;
  };

  const hasContent = selectedDeptIds.size > 0 || ((includeServo && (waitingServo?.length ?? 0) > 0) || (includeReception && (waitingReception?.length ?? 0) > 0));

  const handleExportPDF = () => exportPDF(buildReportHtml(), `daily-report-${reportDate}.pdf`, logo_base64, watermark_enabled ? logo_base64 : null);

  const handleExportWord = () => exportWordDoc(buildReportHtml(), `daily-report-${reportDate}.doc`);

  return (
    <ReportWatermark enabled={watermark_enabled} logo={logo_base64} className="space-y-4">

      {/* ===== Controls (no-print) ===== */}
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">التقرير اليومي</h1>
            <p className="text-muted-foreground text-sm">بيان الحالات — اختر الأقسام ثم اطبع أو صدّر</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2" disabled={!hasContent}
              onClick={() => exportExcel(filteredCases, depts, selectedDeptIds, reportDate, reportTime, reportAmPm, waitingServo, waitingReception, includeServo, includeReception, hospital_name)}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" className="gap-2" disabled={!hasContent} onClick={handleExportWord}>
              <FileText className="h-4 w-4" /> Word
            </Button>
            <Button variant="outline" className="gap-2" disabled={!hasContent} onClick={handleExportPDF}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button className="gap-2" disabled={!hasContent} onClick={handlePrint}>
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </div>

        {/* Date / Time / Font */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs">تاريخ التقرير</Label>
                <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الوقت</Label>
                <div className="flex gap-1">
                  <Input value={reportTime} onChange={e => setReportTime(e.target.value)} className="h-8 text-sm" placeholder="07:30" />
                  <button className="h-8 px-2 border rounded-md text-sm hover:bg-muted min-w-[36px]" onClick={() => setReportAmPm(v => v === "ص" ? "م" : "ص")}>{reportAmPm}</button>
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">حجم الخط ({fontSize[0]}px)</Label>
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground" />
                  <Slider value={fontSize} onValueChange={setFontSize} min={8} max={16} step={1} className="flex-1" />
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Selection */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">اختيار الأقسام</CardTitle>
              <div className="flex gap-2 text-xs">
                <button className="text-primary hover:underline" onClick={selectAll}>الكل</button>
                <span className="text-muted-foreground">|</span>
                <button className="text-muted-foreground hover:underline" onClick={selectNone}>إلغاء</button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid md:grid-cols-3 gap-4">
              {(() => {
                // Build groups: fixed + a dynamic "أخرى" group for custom types
                const otherDepts = depts.filter(d => !FIXED_TYPES.has(d.departmentType as string));
                const allGroups = [
                  ...FIXED_DEPT_GROUPS,
                  ...(otherDepts.length > 0
                    ? [{ key: "__other__", label: "أخرى", types: [...new Set(otherDepts.map(d => d.departmentType as string))] }]
                    : []),
                ];
                return allGroups.map(group => {
                  const groupDepts = depts.filter(d => group.types.includes(d.departmentType as string));
                  if (groupDepts.length === 0) return null;
                  const allSel = groupDepts.every(d => selectedDeptIds.has(d.id));
                  return (
                    <div key={group.key} className="space-y-2 p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allSel}
                          onCheckedChange={() => toggleGroup(group.types as string[])}
                          id={`group-${group.key}`}
                        />
                        <label htmlFor={`group-${group.key}`} className="text-sm font-semibold cursor-pointer">{group.label}</label>
                      </div>
                      <div className="space-y-1 pr-6">
                        {groupDepts.map(d => (
                          <div key={d.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedDeptIds.has(d.id)}
                              onCheckedChange={() => toggleDept(d.id)}
                              id={`dept-${d.id}`}
                            />
                            <label htmlFor={`dept-${d.id}`} className="text-xs cursor-pointer">
                              {d.name} <span className="text-muted-foreground">({d.activeCasesCount}/{d.capacity})</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {filteredCases.length === 0 && selectedDeptIds.size > 0 && (
          <div className="text-center py-8 text-muted-foreground">لا توجد حالات نشطة في الأقسام المختارة</div>
        )}
        {selectedDeptIds.size === 0 && (
          <div className="text-center py-8 text-muted-foreground">اختر قسماً أو أكثر لعرض بيان الحالات</div>
        )}

        {/* Waiting List Selection */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">قوائم الانتظار في التقرير</CardTitle>
              <span className="text-xs text-muted-foreground">اختياري — تضمين في الطباعة</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="incl-servo" checked={includeServo} onCheckedChange={v => setIncludeServo(!!v)} />
                <label htmlFor="incl-servo" className="text-sm cursor-pointer">
                  سيرفو <span className="text-muted-foreground text-xs">({waitingServo?.length ?? 0} حالة)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="incl-recep" checked={includeReception} onCheckedChange={v => setIncludeReception(!!v)} />
                <label htmlFor="incl-recep" className="text-sm cursor-pointer">
                  استقبال <span className="text-muted-foreground text-xs">({waitingReception?.length ?? 0} حالة)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Printable Report (only when dept selected) ===== */}
      {selectedDeptIds.size > 0 && (
        <div className="print-area bg-white text-black" dir="rtl" style={{ fontSize: fontSize[0] }}>

          {/* Report Header */}
          <div className="text-center border-b-2 border-black pb-3 mb-3">
            {logo_base64 && (
              <img src={logo_base64} alt="logo" className="h-14 object-contain mx-auto mb-2" />
            )}
            <h2 className="text-lg font-bold">{hospital_name}</h2>
            <h3 className="text-base font-bold mt-1">بيان الحالات اليومي</h3>
            <p className="text-sm mt-0.5">القسم: {selectedDeptNames}</p>
            <div className="flex justify-center gap-6 mt-1 text-xs">
              <span>يوم: <strong>{dayName}</strong></span>
              <span>التاريخ: <strong>{formatted}</strong></span>
              <span>الساعة: <strong>{reportTime} {reportAmPm}</strong></span>
              <span>عدد الحالات: <strong>{filteredCases.length}</strong></span>
            </div>
          </div>

          {/* Cases Table */}
          {filteredCases.length > 0 ? (
            <table className="w-full border-collapse mb-4" style={{ fontSize: fontSize[0] }}>
              <thead>
                <tr className="bg-gray-200">
                  {["م", "الاسم", "السن", "التشخيص", "تاريخ الدخول", "مدة الإقامة", "سرير/محضن", "ت. التنفس", "ت. فصل التنفس", "Mode"].map(h => (
                    <th key={h} className="border border-gray-600 p-1 text-right font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, i) => {
                  const deptType = deptTypeMap.get(c.departmentId) ?? "";
                  const bedType = getBedType(deptType);
                  return (
                    <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-400 p-1 text-center">{i + 1}</td>
                      <td className="border border-gray-400 p-1 font-medium whitespace-nowrap">{c.patientName}</td>
                      <td className="border border-gray-400 p-1 text-center whitespace-nowrap">{c.age ?? "—"}</td>
                      <td className="border border-gray-400 p-1 max-w-[150px]">{c.diagnosis ?? "—"}</td>
                      <td className="border border-gray-400 p-1 text-center whitespace-nowrap">{formatDateAr(c.admissionDate)}</td>
                      <td className="border border-gray-400 p-1 text-center whitespace-nowrap">{calcStayLabel(c.admissionDate)}</td>
                      <td className="border border-gray-400 p-1 text-center font-medium">{bedType}</td>
                      <td className="border border-gray-400 p-1 text-center">
                        <InlineDateCell caseId={c.id} field="ventilationStartDate" value={c.ventilationStartDate} onSaved={handleLocalEdit} />
                      </td>
                      <td className="border border-gray-400 p-1 text-center">
                        <InlineDateCell caseId={c.id} field="ventilationEndDate" value={c.ventilationEndDate} onSaved={handleLocalEdit} />
                      </td>
                      <td className="border border-gray-400 p-1 text-center">
                        <InlineModeCell caseId={c.id} value={c.artificialRespiration} onSaved={handleLocalEdit} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-center py-4 text-gray-500">لا توجد حالات نشطة</p>
          )}

          {/* Waiting Lists */}
          {((includeServo && (waitingServo?.length ?? 0) > 0) || (includeReception && (waitingReception?.length ?? 0) > 0)) && (
            <div className="mt-4 border-t-2 border-black pt-3">
              <h4 className="font-bold text-sm mb-2">قوائم الانتظار</h4>
              {includeServo && (waitingServo?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <p className="font-semibold mb-1">طوارئ — {waitingServo!.length} حالة</p>
                  <table className="w-full border-collapse" style={{ fontSize: fontSize[0] - 1 }}>
                    <thead>
                      <tr className="bg-gray-100">
                        {["م", "الاسم", "السن", "التشخيص", "التنفس", "نوع الرعاية"].map(h => (
                          <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {waitingServo!.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                          <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1">{c.patientName}</td>
                          <td className="border border-gray-300 p-1">{c.age ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{c.diagnosis ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
                          <td className="border border-gray-300 p-1">{translate(c.careType, LABELS.CARE_TYPES)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {includeReception && (waitingReception?.length ?? 0) > 0 && (
                <div>
                  <p className="font-semibold mb-1">استقبال — {waitingReception!.length} حالة</p>
                  <table className="w-full border-collapse" style={{ fontSize: fontSize[0] - 1 }}>
                    <thead>
                      <tr className="bg-gray-100">
                        {["م", "الاسم", "السن", "التشخيص", "التنفس", "نوع الرعاية"].map(h => (
                          <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {waitingReception!.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                          <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1">{c.patientName}</td>
                          <td className="border border-gray-300 p-1">{c.age ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{c.diagnosis ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
                          <td className="border border-gray-300 p-1">{translate(c.careType, LABELS.CARE_TYPES)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-gray-400 pt-2 mt-3 text-xs text-gray-500">
            نظام BSCH — طُبع بتاريخ {new Date().toLocaleString("ar-EG")}
          </div>
        </div>
      )}
    </ReportWatermark>
  );
}
