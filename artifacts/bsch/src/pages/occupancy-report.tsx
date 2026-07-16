import { useState, useEffect } from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { ClipboardList, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Fixed report rows — beds come from DB, equipment is manual
const REPORT_ROWS: { name: string; total: number; dbKey?: string }[] = [
  { name: "حضانة حديث الولادة",    total: 43, dbKey: "incubator" },
  { name: "حضانات البيكو",         total: 12, dbKey: "picu" },
  { name: "أجهزة تنفس الحضانات",   total: 9 },
  { name: "أجهزة تنفس البيكو",     total: 4 },
  { name: "عالي التردد",           total: 4 },
  { name: "أسرة العناية المركزة",  total: 10, dbKey: "icu_high" },
  { name: "أسرة العناية المتوسطة", total: 6,  dbKey: "icu_med" },
  { name: "أجهزة تنفس العناية",   total: 10 },
  { name: "أسرة القسم الداخلي",    total: 24 },
];

const SHIFTS = [
  { key: "morning", label: "الفترة الصباحية",     short: "صباح" },
  { key: "noon",    label: "المسائية ٤م",          short: "٤ م" },
  { key: "night",   label: "المسائية ١١م",         short: "١١ م" },
];

type RowData = { occupied: string; standby: string; broken: string };
type ShiftData = Record<number, RowData>;
type AllData = Record<string, ShiftData>;

const emptyRow = (): RowData => ({ occupied: "", standby: "", broken: "" });
const emptyShift = (): ShiftData =>
  Object.fromEntries(REPORT_ROWS.map((_, i) => [i, emptyRow()]));

const STORAGE_KEY = "bsch_occupancy_report";

function loadSaved(): AllData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /**/ }
  return Object.fromEntries(SHIFTS.map(s => [s.key, emptyShift()]));
}

function saveData(data: AllData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /**/ }
}

function todayAr() {
  return new Date().toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Print-only table component
// ─────────────────────────────────────────────────────────────────────────────
function PrintShiftTable({
  shift, data, dbOccupied,
}: { shift: typeof SHIFTS[0]; data: ShiftData; dbOccupied: Record<string, number> }) {
  return (
    <div className="print-shift-block" style={{ pageBreakInside: "avoid" }}>
      {/* Sub-header */}
      <div className="text-center mb-1">
        <p className="font-bold text-sm border border-black inline-block px-6 py-0.5">
          بيان الخدمات الطارئة عن {shift.label}
        </p>
      </div>

      <table className="w-full border-collapse text-xs" style={{ direction: "rtl" }}>
        <thead>
          <tr style={{ background: "#e8d5f5" }}>
            <th className="border border-black p-1 text-right font-bold">الأقسام</th>
            <th className="border border-black p-1 text-center font-bold w-16">الإجمالي</th>
            <th className="border border-black p-1 text-center font-bold w-16">مشغول</th>
            <th className="border border-black p-1 text-center font-bold w-24">فارغ + استاند باي</th>
            <th className="border border-black p-1 text-center font-bold w-16">معطل</th>
          </tr>
        </thead>
        <tbody>
          {REPORT_ROWS.map((row, i) => {
            const d = data[i] ?? emptyRow();
            // Determine occupied value: DB-supplied or manual input
            const occ = row.dbKey
              ? (d.occupied !== "" ? Number(d.occupied) : (dbOccupied[row.dbKey] ?? 0))
              : (d.occupied !== "" ? Number(d.occupied) : 0);
            const sb = d.standby !== "" ? Number(d.standby) : 0;
            const br = d.broken !== "" ? Number(d.broken) : 0;
            const free = row.total - occ - sb - br;

            // Format the free+standby cell
            const freePart = free > 0 ? String(free) : "—";
            const sbPart = sb > 0 ? `${sb}+` : "";
            const freeStandby = sb > 0 || free > 0
              ? (sbPart + (free > 0 ? freePart : ""))
              : "—";

            return (
              <tr key={i} style={i % 2 === 0 ? {} : { background: "#faf5ff" }}>
                <td className="border border-black p-1 font-medium">{row.name}</td>
                <td className="border border-black p-1 text-center font-bold">{row.total}</td>
                <td className="border border-black p-1 text-center font-bold">{occ || "—"}</td>
                <td className="border border-black p-1 text-center">{freeStandby}</td>
                <td className="border border-black p-1 text-center">{br > 0 ? br : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Input table for one shift
// ─────────────────────────────────────────────────────────────────────────────
function ShiftInputTable({
  shiftKey, data, onChange, dbOccupied,
}: {
  shiftKey: string;
  data: ShiftData;
  onChange: (rowIdx: number, field: keyof RowData, val: string) => void;
  dbOccupied: Record<string, number>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/40">
            <th className="border p-2 text-right">القسم / الجهاز</th>
            <th className="border p-2 text-center w-16">الإجمالي</th>
            <th className="border p-2 text-center w-28">مشغول</th>
            <th className="border p-2 text-center w-28">استاند باي</th>
            <th className="border p-2 text-center w-28">معطل</th>
            <th className="border p-2 text-center w-16">شاغر</th>
          </tr>
        </thead>
        <tbody>
          {REPORT_ROWS.map((row, i) => {
            const d = data[i] ?? emptyRow();
            const dbVal = row.dbKey ? (dbOccupied[row.dbKey] ?? null) : null;
            const occNum = d.occupied !== "" ? Number(d.occupied) : (dbVal ?? 0);
            const sbNum  = d.standby  !== "" ? Number(d.standby)  : 0;
            const brNum  = d.broken   !== "" ? Number(d.broken)   : 0;
            const free = Math.max(0, row.total - occNum - sbNum - brNum);

            return (
              <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/10"}>
                <td className="border p-2 font-medium">{row.name}</td>
                <td className="border p-2 text-center font-bold text-primary">{row.total}</td>

                {/* Occupied */}
                <td className="border p-1">
                  <Input
                    type="number" min={0} max={row.total}
                    value={d.occupied}
                    onChange={e => onChange(i, "occupied", e.target.value)}
                    className="h-8 text-center text-sm"
                    placeholder={dbVal != null ? String(dbVal) : "0"}
                  />
                  {dbVal != null && d.occupied === "" && (
                    <p className="text-xs text-muted-foreground text-center mt-0.5">من DB: {dbVal}</p>
                  )}
                </td>

                {/* Standby */}
                <td className="border p-1">
                  <Input
                    type="number" min={0} max={row.total}
                    value={d.standby}
                    onChange={e => onChange(i, "standby", e.target.value)}
                    className="h-8 text-center text-sm"
                    placeholder="0"
                  />
                </td>

                {/* Broken */}
                <td className="border p-1">
                  <Input
                    type="number" min={0} max={row.total}
                    value={d.broken}
                    onChange={e => onChange(i, "broken", e.target.value)}
                    className="h-8 text-center text-sm"
                    placeholder="0"
                  />
                </td>

                {/* Free (calculated) */}
                <td className="border p-2 text-center font-bold">
                  <span className={free === 0 ? "text-destructive" : "text-primary"}>
                    {free}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function OccupancyReport() {
  const { data: stats } = useGetDashboardStats();
  const [allData, setAllData] = useState<AllData>(loadSaved);

  // Derive DB-based occupied counts from dashboard stats
  const dbOccupied: Record<string, number> = {};
  if (stats) {
    const ds = stats.departmentStats;
    dbOccupied["icu_high"]  = ds.find(d => d.departmentName === "عناية كبيرة")?.activeCases ?? 0;
    dbOccupied["icu_med"]   = ds.find(d => d.departmentName === "عناية متوسطة")?.activeCases ?? 0;
    dbOccupied["picu"]      = ds.find(d => d.departmentName === "بيكيو")?.activeCases ?? 0;
    dbOccupied["incubator"] =
      (ds.find(d => d.departmentName === "حضانة أ")?.activeCases ?? 0) +
      (ds.find(d => d.departmentName === "حضانة ب")?.activeCases ?? 0) +
      (ds.find(d => d.departmentName === "حضانة ج")?.activeCases ?? 0);
  }

  // Persist data on change
  useEffect(() => { saveData(allData); }, [allData]);

  const handleChange = (shiftKey: string, rowIdx: number, field: keyof RowData, val: string) => {
    setAllData(prev => ({
      ...prev,
      [shiftKey]: {
        ...prev[shiftKey],
        [rowIdx]: { ...(prev[shiftKey]?.[rowIdx] ?? emptyRow()), [field]: val },
      },
    }));
  };

  const resetAll = () => {
    const fresh = Object.fromEntries(SHIFTS.map(s => [s.key, emptyShift()]));
    setAllData(fresh);
    saveData(fresh);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Screen header ── */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">بيان الإشغال اليومي</h1>
            <p className="text-muted-foreground text-sm">
              بيان الخدمات الطارئة — {todayAr()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={resetAll}>
            <RefreshCw className="h-4 w-4" /> مسح البيانات
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-5 w-5" /> طباعة البيان
          </Button>
        </div>
      </div>

      {/* ── Input Tabs (screen only) ── */}
      <div className="no-print">
        <Tabs defaultValue="morning">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {SHIFTS.map(s => (
              <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
            ))}
          </TabsList>
          {SHIFTS.map(s => (
            <TabsContent key={s.key} value={s.key}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">بيانات {s.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    قيم المشغول المأخوذة من قاعدة البيانات تظهر تحت الخانة باللون الرمادي. يمكنك تجاوزها بالكتابة يدوياً.
                  </p>
                </CardHeader>
                <CardContent className="p-0 pb-4">
                  <ShiftInputTable
                    shiftKey={s.key}
                    data={allData[s.key] ?? emptyShift()}
                    onChange={(r, f, v) => handleChange(s.key, r, f, v)}
                    dbOccupied={dbOccupied}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── PRINT VIEW ── */}
      <div className="print-only hidden print:block" dir="rtl">
        {/* Hospital header */}
        <div className="text-center mb-3 border-b-2 border-black pb-2">
          <p className="font-bold text-lg">مستشفى الأطفال التخصصي بالبحيرة</p>
          <p className="text-sm font-bold">****************************</p>
          <p className="text-sm">
            من يوم:&nbsp;&nbsp;&nbsp;{todayAr()}&nbsp;&nbsp;&nbsp;الموافق:&nbsp;&nbsp;&nbsp;{todayAr()}
          </p>
        </div>

        {/* 3 shift tables */}
        <div className="space-y-4">
          {SHIFTS.map(s => (
            <PrintShiftTable
              key={s.key}
              shift={s}
              data={allData[s.key] ?? emptyShift()}
              dbOccupied={dbOccupied}
            />
          ))}
        </div>

        {/* Signature lines */}
        <div className="mt-6 flex justify-between text-xs">
          <div className="text-center">
            <div className="w-40 border-b border-black mb-1 h-6" />
            <p className="font-bold">توقيع النبطشية</p>
          </div>
          <div className="text-center">
            <div className="w-40 border-b border-black mb-1 h-6" />
            <p className="font-bold">الإشراف</p>
          </div>
        </div>
      </div>

      {/* Screen preview (mini) */}
      <div className="no-print">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">معاينة البيان المطبوع</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="scale-[0.7] origin-top-right p-4 bg-white text-black min-w-[700px]" dir="rtl">
              <div className="text-center mb-2 border-b-2 border-black pb-2">
                <p className="font-bold text-base">مستشفى الأطفال التخصصي بالبحيرة</p>
                <p className="text-xs">من يوم: {todayAr()}</p>
              </div>
              <div className="space-y-3">
                {SHIFTS.map(s => (
                  <PrintShiftTable
                    key={s.key}
                    shift={s}
                    data={allData[s.key] ?? emptyShift()}
                    dbOccupied={dbOccupied}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
