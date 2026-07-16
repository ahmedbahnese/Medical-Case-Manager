import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  useGetDashboardStats,
  useGetDepartments,
  useGetCases,
  GetCasesParams,
} from "@workspace/api-client-react";
import { Printer, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { LABELS, translate, calcStayLabel } from "@/lib/constants";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function OccupancyReport() {
  const now = new Date();
  const [reportDate, setReportDate] = useState(now.toISOString().slice(0, 10));
  const [reportTime, setReportTime] = useState(format(now, "hh:mm"));
  const [reportAmPm, setReportAmPm] = useState<"ص" | "م">(parseInt(format(now, "HH")) < 12 ? "ص" : "م");
  const [fontSize, setFontSize] = useState([11]);

  const { data: stats } = useGetDashboardStats();
  const { data: departments } = useGetDepartments();
  const { data: allCases } = useGetCases({ status: "active" } as GetCasesParams);

  const dateObj = new Date(reportDate + "T12:00:00");
  const dayName = DAYS_AR[dateObj.getDay()];
  const formatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

  const totalCapacity = departments?.reduce((s, d) => s + d.capacity, 0) ?? 0;
  const activeCases = allCases?.length ?? 0;
  const occupancyPct = totalCapacity > 0 ? Math.round((activeCases / totalCapacity) * 100) : 0;

  const onVent = (allCases ?? []).filter(c => c.artificialRespiration !== "no").length;
  const critical = (allCases ?? []).filter(c => c.status === "critical").length;

  return (
    <div className="space-y-4">
      {/* Controls - no-print */}
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">بيان الإشغال</h1>
            <p className="text-muted-foreground text-sm">تقرير الإشغال الكامل للمستشفى</p>
          </div>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> طباعة البيان
          </Button>
        </div>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ البيان</Label>
                <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوقت</Label>
                <div className="flex gap-1">
                  <Input value={reportTime} onChange={e => setReportTime(e.target.value)}
                    className="h-8 text-sm flex-1" placeholder="07:00" />
                  <button
                    className="h-8 px-2 border rounded-md text-sm hover:bg-muted"
                    onClick={() => setReportAmPm(v => v === "ص" ? "م" : "ص")}
                  >
                    {reportAmPm}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">حجم الخط ({fontSize[0]}px)</Label>
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground" />
                  <Slider value={fontSize} onValueChange={setFontSize} min={7} max={16} step={1} className="flex-1" />
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report */}
      <div
        className="bg-white text-black rounded-lg overflow-hidden shadow-lg print:shadow-none"
        style={{ fontSize: fontSize[0], direction: "rtl", fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black py-4 px-6">
          <h2 style={{ fontSize: fontSize[0] + 4 }} className="font-bold">مستشفى الأطفال التخصصي بالبحيرة</h2>
          <h3 className="font-bold mt-1">بيان الإشغال</h3>
          <p className="mt-1">
            يوم {dayName} الموافق {formatted} — الساعة: {reportTime} {reportAmPm}
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: "إجمالي الحالات", value: activeCases, border: "border-blue-500" },
              { label: "نسبة الإشغال", value: `${occupancyPct}%`, border: "border-orange-500" },
              { label: "على التنفس", value: onVent, border: "border-teal-500" },
              { label: "حالات حرجة", value: critical, border: "border-red-500" },
            ].map(s => (
              <div key={s.label} className={`border-2 ${s.border} rounded p-2`}>
                <div className="font-bold text-lg">{s.value}</div>
                <div className="text-xs">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Per-Department Table */}
          <div>
            <h3 className="font-bold border-b border-black pb-1 mb-2">توزيع الإشغال على الأقسام</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {["م", "القسم", "السعة", "نشط", "فاضي", "نسبة", "حرج", "تنفس"].map(h => (
                    <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments?.map((d, i) => {
                  const dStat = stats?.departmentStats.find(s => s.departmentId === d.id);
                  const active = dStat?.activeCases ?? 0;
                  const crit = dStat?.criticalCases ?? 0;
                  const ventCount = (allCases ?? []).filter(c => c.departmentId === d.id && c.artificialRespiration !== "no").length;
                  const pct = Math.round((active / d.capacity) * 100);
                  return (
                    <tr key={d.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                      <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                      <td className="border border-gray-300 p-1 font-medium">{d.name}</td>
                      <td className="border border-gray-300 p-1 text-center">{d.capacity}</td>
                      <td className="border border-gray-300 p-1 text-center font-bold">{active}</td>
                      <td className="border border-gray-300 p-1 text-center">{d.capacity - active}</td>
                      <td className={`border border-gray-300 p-1 text-center font-bold ${pct >= 100 ? "bg-red-100 text-red-700" : pct >= 80 ? "bg-yellow-100" : ""}`}>
                        {pct}%
                      </td>
                      <td className="border border-gray-300 p-1 text-center">{crit}</td>
                      <td className="border border-gray-300 p-1 text-center">{ventCount}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={2} className="border border-gray-400 p-1 text-right">الإجمالي</td>
                  <td className="border border-gray-400 p-1 text-center">{totalCapacity}</td>
                  <td className="border border-gray-400 p-1 text-center">{activeCases}</td>
                  <td className="border border-gray-400 p-1 text-center">{totalCapacity - activeCases}</td>
                  <td className="border border-gray-400 p-1 text-center">{occupancyPct}%</td>
                  <td className="border border-gray-400 p-1 text-center">{critical}</td>
                  <td className="border border-gray-400 p-1 text-center">{onVent}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* All Active Cases */}
          <div>
            <h3 className="font-bold border-b border-black pb-1 mb-2">بيان الحالات النشطة</h3>
            <table className="w-full border-collapse" style={{ fontSize: fontSize[0] - 1 }}>
              <thead>
                <tr className="bg-gray-100">
                  {["م", "الاسم", "السن", "القسم", "التشخيص", "التنفس الصناعي", "مدة الإقامة", "الحالة", "MOBE"].map(h => (
                    <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(allCases ?? []).map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                    <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                    <td className="border border-gray-300 p-1">{c.patientName}</td>
                    <td className="border border-gray-300 p-1">{c.age ?? "—"}</td>
                    <td className="border border-gray-300 p-1">{c.departmentName}</td>
                    <td className="border border-gray-300 p-1 max-w-[120px]">{c.diagnosis ?? "—"}</td>
                    <td className="border border-gray-300 p-1">
                      {c.artificialRespiration !== "no" ? translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION) : "—"}
                    </td>
                    <td className="border border-gray-300 p-1 text-center">{calcStayLabel(c.admissionDate)}</td>
                    <td className="border border-gray-300 p-1">{translate(c.status, LABELS.STATUS)}</td>
                    <td className="border border-gray-300 p-1">{(c as any).mobe ?? "—"}</td>
                  </tr>
                ))}
                {(allCases ?? []).length === 0 && (
                  <tr>
                    <td colSpan={9} className="border border-gray-300 p-4 text-center text-gray-500">لا توجد حالات نشطة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-300 py-3 text-xs space-y-1">
          <p>نظام إدارة الحالات الطبية BSCH</p>
          <p>تم الطباعة بتاريخ: {new Date().toLocaleString("ar-EG")}</p>
        </div>
      </div>
    </div>
  );
}
