import { useLocation, useParams } from "wouter";
import { useGetDepartment, useUpdateCase } from "@workspace/api-client-react";
import { useAppSettings } from "@/contexts/settings-context";
import { exportPDF } from "@/lib/pdf-export";
import { ReportWatermark } from "@/components/report-watermark";

function formatDateAr(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
  } catch { return "—"; }
}

function calcStayLabel(admissionDate: string | null | undefined): string {
  if (!admissionDate) return "—";
  const diff = Math.floor((Date.now() - new Date(admissionDate).getTime()) / 86400000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "يوم";
  if (diff < 11) return `${diff} أيام`;
  return `${diff} يوماً`;
}

function translate(val: string | null | undefined, map: Record<string, string>): string {
  if (!val) return "—";
  return map[val] ?? val;
}

const STATUS_MAP: Record<string, string> = {
  active: "نشط", critical: "حرج", recovering: "تعافي", discharged: "خُرّج",
};
const RESP_MAP: Record<string, string> = {
  high_frequency: "HFO (تردد عالي)", vent: "فنت (VENT)", cpap: "سباب (CPAP)",
  standby: "استاندباي", hfnc: "HFNC", box: "بوكس / نيزل كانيولا", no: "هواء الغرفة",
};
const DEPT_TYPE_MAP: Record<string, string> = {
  intensive_care_high: "عناية مركزة (مرتفعة)", intensive_care_medium: "عناية مركزة (متوسطة)",
  picu: "PICU", incubator_a: "حضانة A", incubator_b: "حضانة B", incubator_c: "حضانة C",
};

/* ── Configurable field definitions ── */
const ALL_DEPT_FIELDS: { key: string; label: string; getText: (c: any) => string }[] = [
  { key: "fileNumber",            label: "رقم الملف",       getText: c => c.fileNumber ?? "—" },
  { key: "age",                   label: "السن",             getText: c => c.age ?? "—" },
  { key: "diagnosis",             label: "التشخيص",         getText: c => c.diagnosis ?? "—" },
  { key: "admissionDate",         label: "تاريخ الدخول",    getText: c => formatDateAr(c.admissionDate) },
  { key: "stayDays",              label: "مدة الإقامة",     getText: c => calcStayLabel(c.admissionDate) },
  { key: "status",                label: "الحالة",          getText: c => translate(c.status, STATUS_MAP) },
  { key: "artificialRespiration", label: "التنفس الصناعي",  getText: c => translate(c.artificialRespiration, RESP_MAP) },
  { key: "mobe",                  label: "MOBE",             getText: c => c.mobe ?? "—" },
  { key: "parentName",            label: "ولي الأمر",       getText: c => c.parentName ?? "—" },
  { key: "parentPhone",           label: "هاتف ولي الأمر", getText: c => c.parentPhone ?? "—" },
  { key: "nationalId",            label: "الرقم القومي",    getText: c => c.nationalId ?? "—" },
];

const DEFAULT_DEPT_FIELD_KEYS = ALL_DEPT_FIELDS.map(f => f.key);

function getActiveFields(reportFieldsJson: string | null | undefined) {
  try {
    const parsed = JSON.parse(reportFieldsJson ?? "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) return ALL_DEPT_FIELDS;
    const result: { key: string; label: string; getText: (c: any) => string }[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string") {
        const found = ALL_DEPT_FIELDS.find(f => f.key === entry);
        if (found) result.push(found);
      } else if (entry && typeof entry === "object" && entry.isCustom && entry.key && entry.label) {
        // Custom field — show "—" since case records don't carry custom values
        result.push({ key: entry.key, label: entry.label, getText: () => "—" });
      }
    }
    return result.length > 0 ? result : ALL_DEPT_FIELDS;
  } catch { return ALL_DEPT_FIELDS; }
}

function buildDeptHtml(deptName: string, cases: any[], hospitalName: string, reportFieldsJson?: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const activeFields = getActiveFields(reportFieldsJson);
  const headers = activeFields.map(f => `<th>${f.label}</th>`).join("");
  const rows = cases.map((c, i) => {
    const cells = activeFields.map(f => `<td>${f.getText(c)}</td>`).join("");
    return `<tr><td style="text-align:center">${i + 1}</td><td><strong>${c.patientName}</strong></td>${cells}</tr>`;
  }).join("");
  return `
    <div class="header">
      <h2>${hospitalName}</h2>
      <h3>بيان حالات — ${deptName}</h3>
      <p>${dateStr} — إجمالي الحالات: ${cases.length}</p>
    </div>
    <table border="1">
      <tr style="background:#d9e1f2">
        <th>م</th><th>الاسم</th>${headers}
      </tr>
      ${rows}
    </table>`;
}

function exportToExcelFormatted(deptName: string, cases: any[], hospitalName: string, reportFieldsJson?: string): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const activeFields = getActiveFields(reportFieldsJson);
  const headers = activeFields.map(f => `<th>${f.label}</th>`).join("");
  const rows = cases.map((c, i) => {
    const cells = activeFields.map(f => `<td>${f.getText(c)}</td>`).join("");
    return `<tr style="background:${i%2===0?"white":"#f5f5f5"}"><td style="text-align:center">${i+1}</td><td><strong>${c.patientName}</strong></td>${cells}</tr>`;
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" dir="rtl">
<head><meta charset="utf-8">
<style>
  body { font-family: Arial; direction: rtl; font-size: 11pt; }
  h2,h3 { text-align: center; margin: 4px 0; }
  p { text-align: center; margin: 2px 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
  th, td { border: 1px solid #555; padding: 5px 8px; text-align: right; vertical-align: top; }
  th { background: #2563eb; color: white; font-weight: bold; }
</style></head>
<body>
<h2>${hospitalName}</h2>
<h3>بيان حالات — ${deptName}</h3>
<p>${dateStr} — إجمالي الحالات: ${cases.length}</p>
<table>
  <tr><th>م</th><th>الاسم</th>${headers}</tr>
  ${rows}
</table>
</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `بيان-${deptName}-${now.toISOString().slice(0,10)}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
}

import { Activity, ArrowLeft, Bed, Calendar, FileText, Plus, User, AlertTriangle, Search, Printer, FileSpreadsheet, Download, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

export default function DepartmentDetail() {
  const { id } = useParams();
  const departmentId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [searchFilter, setSearchFilter] = useState("");
  const { hospital_name, logo_base64, watermark_enabled } = useAppSettings();

  const { data: dept, isLoading } = useGetDepartment(departmentId);

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-xl" /></div>;
  }

  if (!dept) return <div>القسم غير موجود</div>;

  const activeCases = dept.cases?.filter(c => c.status !== "discharged") ?? [];
  const filteredCases = activeCases.filter(c =>
    !searchFilter ||
    c.patientName.includes(searchFilter) ||
    (c.fileNumber && c.fileNumber.includes(searchFilter)) ||
    (c.diagnosis && c.diagnosis.includes(searchFilter))
  );

  const rfJson = (dept as any).reportFieldsJson as string | undefined;
  const activeFields = getActiveFields(rfJson);

  const handlePrint = () => window.print();
  const handleExportWord = () => {
    const html = buildDeptHtml(dept.name, filteredCases, hospital_name, rfJson);
    const full = `<html xmlns:o="urn:schemas-microsoft-com:office:office" dir="rtl"><head><meta charset="utf-8">
      <style>body{font-family:Arial;direction:rtl;}table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}th{background:#2563eb;color:white;}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px;}
      </style></head><body>${html}</body></html>`;
    const blob = new Blob([full], { type: "application/msword" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `بيان-${dept.name}-${new Date().toISOString().slice(0,10)}.doc`; a.click();
  };
  const handleExportPDF = () => {
    exportPDF(buildDeptHtml(dept.name, filteredCases, hospital_name, rfJson), `dept-${dept.name}.pdf`, logo_base64, watermark_enabled ? logo_base64 : null);
  };

  return (
    <ReportWatermark enabled={watermark_enabled} logo={logo_base64} className="space-y-6 animate-in fade-in">
      {/* Print-only header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-2">
        {logo_base64 && <img src={logo_base64} alt="logo" className="h-14 object-contain mx-auto mb-2" />}
        <h1 className="text-xl font-bold">بيان حالات — {dept.name}</h1>
        <p className="text-sm">{new Date().toLocaleDateString("ar-EG", {weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}</p>
        <p className="text-sm">الإجمالي: {dept.capacity} — مشغول: {dept.activeCasesCount} — شاغر: {dept.capacity - dept.activeCasesCount}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-sm cursor-pointer hover:text-primary" onClick={() => setLocation("/dashboard")}>الرئيسية</span>
            <span>/</span>
            <span className="text-sm">الأقسام</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {dept.name}
            <Badge variant="outline" className="text-base py-1 px-3 border-primary/50 text-primary">
              {translate(dept.departmentType, DEPT_TYPE_MAP)}
            </Badge>
          </h1>
          {dept.description && <p className="text-muted-foreground mt-2">{dept.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportToExcelFormatted(dept.name, filteredCases, hospital_name, rfJson)}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportWord}>
            <FileText className="h-4 w-4" /> Word
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> طباعة
          </Button>
          <Button onClick={() => setLocation(`/add-case?departmentId=${dept.id}`)} size="sm">
            <Plus className="ml-2 h-4 w-4" />
            إضافة حالة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 no-print">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full"><Bed className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الأسرة</p>
              <p className="text-2xl font-bold">{dept.capacity}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-full"><Activity className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">الأسرة المشغولة</p>
              <p className="text-2xl font-bold">{dept.activeCasesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-full"><Activity className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">الأسرة الشاغرة</p>
              <p className="text-2xl font-bold">{dept.capacity - dept.activeCasesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-destructive/20 p-3 rounded-full"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">حالات حرجة</p>
              <p className="text-2xl font-bold text-destructive">
                {dept.cases?.filter(c => c.status === 'critical').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table — print-area so print starts here */}
      <Card className="print-area">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>قائمة الحالات النشطة</CardTitle>
            <CardDescription>جميع المرضى المقيمين حالياً بالقسم</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 no-print">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو التشخيص أو رقم الملف..."
              className="pr-9"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>اسم المريض</TableHead>
                {activeFields.map(f => <TableHead key={f.key}>{f.label}</TableHead>)}
                <TableHead className="no-print"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeFields.length + 2} className="h-32 text-center text-muted-foreground">
                    لا يوجد حالات مطابقة للبحث أو القسم فارغ
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/case/${c.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {c.patientName}
                      </div>
                    </TableCell>
                    {activeFields.map(f => (
                      <TableCell key={f.key} className={f.key === 'diagnosis' ? 'max-w-[180px] truncate' : ''}>
                        {f.key === 'status' ? (
                          <Badge variant={c.status === 'critical' ? 'destructive' : c.status === 'active' ? 'default' : 'secondary'}>
                            {translate(c.status, STATUS_MAP)}
                          </Badge>
                        ) : f.key === 'artificialRespiration' ? (
                          c.artificialRespiration !== 'no'
                            ? <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30">{translate(c.artificialRespiration, RESP_MAP)}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <span className="text-sm">{f.getText(c)}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="no-print">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ReportWatermark>
  );
}
