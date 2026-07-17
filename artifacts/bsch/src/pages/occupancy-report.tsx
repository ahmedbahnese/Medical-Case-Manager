import { useState, useCallback } from "react";
import { useGetDepartments, useGetCases, useGetWaitingCases } from "@workspace/api-client-react";
import { Printer, FileSpreadsheet, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { exportWordDoc } from "@/lib/word-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAppSettings } from "@/contexts/settings-context";
import { LABELS, translate, calcStayLabel } from "@/lib/constants";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const SHIFTS = [
  { key: "morning",   label: "الفترة الصباحية",   icon: "☀️" },
  { key: "afternoon", label: "الفترة المسائية 4م", icon: "🌅" },
  { key: "night",     label: "الفترة المسائية 11م", icon: "🌙" },
] as const;

const REPORT_ROWS = [
  { key: "inc_beds",   label: "حضانة حديث الولادة",    deptTypes: ["incubator_a","incubator_b","incubator_c"], defaultTotal: 43 },
  { key: "picu_beds",  label: "حضانات البيكو",           deptTypes: ["picu"],                                   defaultTotal: 12 },
  { key: "inc_vents",  label: "أجهزة تنفس الحضانات",    ventDepts: ["incubator_a","incubator_b","incubator_c"], defaultTotal: 9  },
  { key: "picu_vents", label: "أجهزة تنفس البيكو",      ventDepts: ["picu"],                                   defaultTotal: 4  },
  { key: "hfo",        label: "عالي التردد",             hfoOnly: true,                                         defaultTotal: 4  },
  { key: "icu_high",   label: "أسرة العناية المركزة",    deptTypes: ["intensive_care_high"],                    defaultTotal: 10 },
  { key: "icu_med",    label: "أسرة العناية المتوسطة",  deptTypes: ["intensive_care_medium"],                  defaultTotal: 6  },
  { key: "icu_vents",  label: "أجهزة تنفس العناية",     ventDepts: ["intensive_care_high","intensive_care_medium"], defaultTotal: 8 },
  { key: "internal",   label: "أسرة القسم الداخلي",     manual: true,                                          defaultTotal: 24 },
] as const;

type RowKey = typeof REPORT_ROWS[number]["key"];

// Each row: total, occupied, standby, broken — free is calculated
interface RowData { total: number; occupied: number; standby: number; broken: number }
type ShiftData = Record<RowKey, RowData>;

function makeFree(rd: RowData): number {
  return Math.max(0, rd.total - rd.occupied - rd.standby - rd.broken);
}

function makeEmptyShift(): ShiftData {
  const obj: Partial<ShiftData> = {};
  for (const r of REPORT_ROWS) obj[r.key as RowKey] = { total: r.defaultTotal, occupied: 0, standby: 0, broken: 0 };
  return obj as ShiftData;
}

type ShiftIdx = 0 | 1 | 2;

interface ShiftTableProps {
  shift: typeof SHIFTS[number];
  shiftIndex: ShiftIdx;
  activeShift: ShiftIdx;
  data: ShiftData;
  onChange: (key: RowKey, field: keyof RowData, value: number) => void;
  fontSize: number;
  isFirst?: boolean;
}

function NumCell({ val, editable, onChange, fontSize }: { val: number | string; editable: boolean; onChange: (v: number) => void; fontSize: number }) {
  if (!editable) return <span className="text-muted-foreground/60">---</span>;
  if (typeof val === "string") return <span>{val}</span>;
  return (
    <input
      type="number" min={0} max={999} value={val}
      onChange={e => onChange(Number(e.target.value) || 0)}
      className="w-12 border-b border-gray-300 text-center bg-transparent focus:outline-none focus:border-blue-400"
      style={{ fontSize }}
    />
  );
}

function ShiftTable({ shift, shiftIndex, activeShift, data, onChange, fontSize, isFirst }: ShiftTableProps) {
  const editable = shiftIndex <= activeShift;

  return (
    <div className="mb-4 break-inside-avoid print-shift-block">
      <h4 className={`font-bold text-center border border-black py-1 ${editable ? "bg-gray-100" : "bg-gray-50 text-gray-400"}`}
        style={{ fontSize: fontSize + 1 }}>
        {shift.icon} بيان الخدمة الطارئة للـ {shift.label}
        {!editable && <span className="text-xs mr-2">(لم تُدخل بعد)</span>}
      </h4>
      <table className="w-full border-collapse" style={{ fontSize }}>
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-600 p-1 text-right w-[30%]">الأقسام</th>
            <th className="border border-gray-600 p-1 text-center w-[14%]">الإجمالي</th>
            <th className="border border-gray-600 p-1 text-center w-[14%]">مشغول</th>
            <th className="border border-gray-600 p-1 text-center w-[14%]">فارغ</th>
            <th className="border border-gray-600 p-1 text-center w-[14%]">استاندباي</th>
            <th className="border border-gray-600 p-1 text-center w-[14%]">معطل</th>
          </tr>
        </thead>
        <tbody>
          {REPORT_ROWS.map((r, i) => {
            const rd = data[r.key as RowKey];
            return (
              <tr key={r.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-400 p-1 font-medium">{r.label}</td>
                <td className="border border-gray-400 p-1 text-center">
                  {isFirst && editable ? (
                    <input type="number" min={0} max={999} value={rd.total}
                      onChange={e => onChange(r.key as RowKey, "total", Number(e.target.value)||0)}
                      className="w-12 border-b border-gray-300 text-center bg-transparent focus:outline-none" style={{ fontSize }} />
                  ) : <span>{editable ? rd.total : "---"}</span>}
                </td>
                <td className="border border-gray-400 p-1 text-center">
                  <NumCell val={rd.occupied} editable={editable} onChange={v => onChange(r.key as RowKey, "occupied", v)} fontSize={fontSize} />
                </td>
                <td className="border border-gray-400 p-1 text-center font-medium">
                  {editable ? makeFree(rd) : "---"}
                </td>
                <td className="border border-gray-400 p-1 text-center">
                  <NumCell val={rd.standby} editable={editable} onChange={v => onChange(r.key as RowKey, "standby", v)} fontSize={fontSize} />
                </td>
                <td className="border border-gray-400 p-1 text-center">
                  <NumCell val={rd.broken} editable={editable} onChange={v => onChange(r.key as RowKey, "broken", v)} fontSize={fontSize} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function exportWord(shifts: ShiftData[], activeShift: ShiftIdx, hospitalName: string, reportDate: string, dayName: string, supervisor: string, waitingServo: any[], waitingReception: any[], includeServo: boolean, includeReception: boolean) {
  let html = `
    <div class="header">
      <p>مديرية الصحة بالبحيرة</p>
      <h2>${hospitalName}</h2>
      <h3>بيان الخدمة الطارئة</h3>
      <p>عن يوم ${dayName} الموافق ${reportDate}</p>
    </div>`;
  SHIFTS.forEach((shift, si) => {
    if (si > activeShift) return;
    const sd = shifts[si];
    html += `<h4 style="text-align:center;border:1px solid #000;padding:4px;background:#e8e8e8">${shift.label}</h4>
    <table border="1">
      <tr style="background:#d9e1f2"><th>الأقسام</th><th>الإجمالي</th><th>مشغول</th><th>فارغ</th><th>استاندباي</th><th>معطل</th></tr>`;
    REPORT_ROWS.forEach(r => {
      const d = sd[r.key as RowKey];
      html += `<tr><td>${r.label}</td>
        <td style="text-align:center">${d.total}</td>
        <td style="text-align:center">${d.occupied}</td>
        <td style="text-align:center">${makeFree(d)}</td>
        <td style="text-align:center">${d.standby}</td>
        <td style="text-align:center">${d.broken}</td></tr>`;
    });
    if (includeServo && (waitingServo?.length ?? 0) > 0) {
      const wrows = waitingServo.map((c, i) => `<tr style="${i%2===0?'':'background:#f5f5f5'}">
        <td style="text-align:center">${i+1}</td><td>${c.patientName}</td><td>${c.age ?? "—"}</td><td>${c.diagnosis ?? "—"}</td></tr>`).join("");
      html += `</table><p><strong>سيرفو (${waitingServo.length} حالة)</strong></p><table border="1"><tr style="background:#d9e1f2"><th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th></tr>${wrows}`;
    }
    if (includeReception && (waitingReception?.length ?? 0) > 0) {
      const wrows = waitingReception.map((c, i) => `<tr style="${i%2===0?'':'background:#f5f5f5'}">
        <td style="text-align:center">${i+1}</td><td>${c.patientName}</td><td>${c.age ?? "—"}</td><td>${c.diagnosis ?? "—"}</td></tr>`).join("");
      html += `</table><p><strong>استقبال (${waitingReception.length} حالة)</strong></p><table border="1"><tr style="background:#d9e1f2"><th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th></tr>${wrows}`;
    }
    html += '</table><br/>';
  });
  if (supervisor) html += `<p style="margin-top:20pt"><strong>الإشراف:</strong> ${supervisor}</p>`;
  exportWordDoc(html, `occupancy-${reportDate}.doc`);
}

function exportExcel(shifts: ShiftData[], activeShift: ShiftIdx, hospitalName: string, reportDate: string, dayName: string, supervisor: string) {
  const allRows: any[][] = [[hospitalName], [`بيان الخدمة الطارئة — ${dayName} ${reportDate}`], []];
  SHIFTS.forEach((s, si) => {
    if (si > activeShift) return;
    const sd = shifts[si];
    allRows.push([s.label]);
    allRows.push(["الأقسام","الإجمالي","مشغول","فارغ","استاندباي","معطل"]);
    REPORT_ROWS.forEach(r => {
      const d = sd[r.key as RowKey];
      allRows.push([r.label, d.total, d.occupied, makeFree(d), d.standby, d.broken]);
    });
    allRows.push([]);
  });
  if (supervisor) allRows.push([`الإشراف: ${supervisor}`]);
  const tsv = allRows.map(r => r.join("\t")).join("\n");
  const blob = new Blob(["\uFEFF"+tsv], {type:"text/tab-separated-values;charset=utf-8;"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`occupancy-${reportDate}.xls`; a.click();
}

export default function OccupancyReport() {
  const { hospital_name } = useAppSettings();
  const now = new Date();
  const [reportDate, setReportDate] = useState(now.toISOString().slice(0, 10));
  const [fontSize, setFontSize] = useState([11]);
  const [supervisor, setSupervisor] = useState("");
  const [activeShift, setActiveShift] = useState<ShiftIdx>(0);
  const [includeServo, setIncludeServo] = useState(false);
  const [includeReception, setIncludeReception] = useState(false);
  const [servoShift, setServoShift] = useState<ShiftIdx>(0);
  const [receptionShift, setReceptionShift] = useState<ShiftIdx>(0);

  const [shifts, setShifts] = useState<ShiftData[]>([makeEmptyShift(), makeEmptyShift(), makeEmptyShift()]);

  const { data: departments } = useGetDepartments();
  const { data: allCases } = useGetCases({ status: "active" } as any);
  const { data: waitingServo } = useGetWaitingCases({ section: "servo", status: "waiting" } as any);
  const { data: waitingReception } = useGetWaitingCases({ section: "reception", status: "waiting" } as any);

  const [dbFilled, setDbFilled] = useState(false);
  if (!dbFilled && departments && allCases) {
    setDbFilled(true);
    const deptTypeMap = new Map((departments ?? []).map((d: any) => [d.id, d.departmentType as string]));
    const casesArr = allCases ?? [];

    const getCount = (deptTypes: readonly string[], ventOnly = false, hfoOnly = false) =>
      casesArr.filter((c: any) => {
        const t = deptTypeMap.get(c.departmentId) ?? "";
        if (!deptTypes.includes(t)) return false;
        if (hfoOnly) return c.artificialRespiration === "high_frequency";
        if (ventOnly) return c.artificialRespiration && c.artificialRespiration !== "no";
        return true;
      }).length;

    const newShift0 = makeEmptyShift();
    newShift0.inc_beds.occupied  = getCount(["incubator_a","incubator_b","incubator_c"]);
    newShift0.picu_beds.occupied = getCount(["picu"]);
    newShift0.inc_vents.occupied = getCount(["incubator_a","incubator_b","incubator_c"], true);
    newShift0.picu_vents.occupied= getCount(["picu"], true);
    newShift0.hfo.occupied       = getCount(["intensive_care_high","intensive_care_medium","picu","incubator_a","incubator_b","incubator_c"], false, true);
    newShift0.icu_high.occupied  = getCount(["intensive_care_high"]);
    newShift0.icu_med.occupied   = getCount(["intensive_care_medium"]);
    newShift0.icu_vents.occupied = getCount(["intensive_care_high","intensive_care_medium"], true);

    const totalInc = (departments ?? []).filter((d: any) => ["incubator_a","incubator_b","incubator_c"].includes(d.departmentType)).reduce((s: number, d: any) => s + d.capacity, 0);
    const totalPicu = (departments ?? []).find((d: any) => d.departmentType === "picu")?.capacity ?? 12;
    const totalIcuH = (departments ?? []).find((d: any) => d.departmentType === "intensive_care_high")?.capacity ?? 10;
    const totalIcuM = (departments ?? []).find((d: any) => d.departmentType === "intensive_care_medium")?.capacity ?? 6;

    if (totalInc) newShift0.inc_beds.total = totalInc;
    if (totalPicu) newShift0.picu_beds.total = totalPicu;
    if (totalIcuH) newShift0.icu_high.total = totalIcuH;
    if (totalIcuM) newShift0.icu_med.total = totalIcuM;

    setShifts([newShift0, { ...newShift0 }, { ...newShift0 }]);
  }

  const updateShift = useCallback((si: number, key: RowKey, field: keyof RowData, val: number) => {
    setShifts(prev => {
      const next = [...prev];
      next[si] = { ...prev[si], [key]: { ...prev[si][key], [field]: val } };
      return next;
    });
  }, []);

  const dateObj = new Date(reportDate + "T12:00:00");
  const dayName = DAYS_AR[dateObj.getDay()];
  const formatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
  const fs = fontSize[0];

  return (
    <div className="space-y-4">
      {/* Controls — no-print */}
      <div className="no-print space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">بيان الإشغال</h1>
            <p className="text-sm text-muted-foreground">بيان الخدمة الطارئة — 3 فترات</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => exportExcel(shifts, activeShift, hospital_name, formatted, dayName, supervisor)}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => exportWord(shifts, activeShift, hospital_name, formatted, dayName, supervisor, waitingServo ?? [], waitingReception ?? [], includeServo, includeReception)}>
              <FileText className="h-4 w-4" /> Word
            </Button>
            <Button size="sm" className="gap-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {/* Date & supervisor */}
          <Card>
            <CardContent className="pt-4 pb-3 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">تاريخ البيان</Label>
                <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">اسم المشرف</Label>
                <Input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="د. ..." className="h-8 text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Active shift selector */}
          <Card>
            <CardHeader className="pb-1 pt-3"><CardTitle className="text-xs">الفترة الحالية (التي تُدخل بياناتها الآن)</CardTitle></CardHeader>
            <CardContent className="pb-3 space-y-2">
              <div className="flex gap-2">
                {SHIFTS.map((s, i) => (
                  <Button key={s.key} size="sm" className="flex-1 text-xs px-1"
                    variant={activeShift === i ? "default" : "outline"}
                    onClick={() => setActiveShift(i as ShiftIdx)}>
                    {s.icon} {i === 0 ? "صباحية" : i === 1 ? "4م" : "11م"}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                الفترات السابقة للفترة المختارة تبقى كما هي، واللاحقة تظهر (---)
              </p>
            </CardContent>
          </Card>

          {/* Waiting cases */}
          <Card>
            <CardHeader className="pb-1 pt-3"><CardTitle className="text-xs">إضافة قوائم الانتظار للبيان</CardTitle></CardHeader>
            <CardContent className="pb-3 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="servo" checked={includeServo} onCheckedChange={v => setIncludeServo(!!v)} />
                  <label htmlFor="servo" className="text-xs cursor-pointer">سيرفو ({waitingServo?.length ?? 0} حالة)</label>
                </div>
                {includeServo && (
                  <div className="flex gap-1 mr-5">
                    {SHIFTS.map((s, i) => (
                      <Button key={s.key} size="sm" variant={servoShift === i ? "secondary" : "ghost"} className="text-xs h-6 px-1"
                        onClick={() => setServoShift(i as ShiftIdx)}>{s.icon}</Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="recep" checked={includeReception} onCheckedChange={v => setIncludeReception(!!v)} />
                  <label htmlFor="recep" className="text-xs cursor-pointer">استقبال ({waitingReception?.length ?? 0} حالة)</label>
                </div>
                {includeReception && (
                  <div className="flex gap-1 mr-5">
                    {SHIFTS.map((s, i) => (
                      <Button key={s.key} size="sm" variant={receptionShift === i ? "secondary" : "ghost"} className="text-xs h-6 px-1"
                        onClick={() => setReceptionShift(i as ShiftIdx)}>{s.icon}</Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Label className="text-xs">حجم الخط ({fs})</Label>
                <div className="flex items-center gap-2 mt-1">
                  <ZoomOut className="h-3 w-3 text-muted-foreground" />
                  <Slider value={fontSize} onValueChange={setFontSize} min={8} max={16} step={1} className="flex-1" />
                  <ZoomIn className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Printable Report */}
      <div className="print-area bg-white text-black" dir="rtl" style={{ fontSize: fs }}>
        {/* Report Header */}
        <div className="text-center mb-3 border-b-2 border-black pb-2">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span>مديرية الصحة بالبحيرة</span>
            <span>★★★★★★</span>
          </div>
          <h2 className="font-bold" style={{ fontSize: fs + 4 }}>{hospital_name}</h2>
          <h3 className="font-bold" style={{ fontSize: fs + 2 }}>بيان الخدمة الطارئة</h3>
          <p>عن يوم {dayName} الموافق {formatted}</p>
        </div>

        {/* 3 Shift Tables */}
        {SHIFTS.map((shift, si) => (
          <div key={shift.key}>
            <ShiftTable
              shift={shift}
              shiftIndex={si as ShiftIdx}
              activeShift={activeShift}
              data={shifts[si]}
              onChange={(key, field, val) => updateShift(si, key, field, val)}
              fontSize={fs}
              isFirst={si === 0}
            />
            {/* Waiting cases for this shift */}
            {includeServo && servoShift === si && (waitingServo?.length ?? 0) > 0 && (
              <WaitingTable title="سيرفو" cases={waitingServo!} fontSize={fs} />
            )}
            {includeReception && receptionShift === si && (waitingReception?.length ?? 0) > 0 && (
              <WaitingTable title="استقبال" cases={waitingReception!} fontSize={fs} />
            )}
          </div>
        ))}

        {/* Footer / Signature */}
        <div className="mt-4 border-t border-gray-400 pt-2 flex justify-between" style={{ fontSize: fs }}>
          <div>
            <p className="font-bold">الإشراف:</p>
            <p className="mt-4">1. {supervisor || "..............................."}</p>
            <p className="mt-2">2. ...............................</p>
          </div>
          <div className="text-center text-xs text-gray-400">
            <p>نظام BSCH</p>
            <p>{new Date().toLocaleString("ar-EG")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitingTable({ title, cases, fontSize }: { title: string; cases: any[]; fontSize: number }) {
  return (
    <div className="mb-3 border-t border-gray-300 pt-2">
      <p className="font-semibold mb-1" style={{ fontSize }}>قائمة انتظار — {title} ({cases.length} حالة)</p>
      <table className="w-full border-collapse" style={{ fontSize: fontSize - 1 }}>
        <thead><tr className="bg-gray-100">
          {["م","الاسم","السن","التشخيص","نوع الرعاية"].map(h => (
            <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {cases.map((c: any, i: number) => (
            <tr key={c.id} className={i%2===0?"":"bg-gray-50"}>
              <td className="border border-gray-300 p-1 text-center">{i+1}</td>
              <td className="border border-gray-300 p-1">{c.patientName}</td>
              <td className="border border-gray-300 p-1">{c.age??"—"}</td>
              <td className="border border-gray-300 p-1">{c.diagnosis??"—"}</td>
              <td className="border border-gray-300 p-1">{translate(c.careType, LABELS.CARE_TYPES)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
