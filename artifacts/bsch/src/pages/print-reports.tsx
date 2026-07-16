import { useState, useRef } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  useGetCases, useGetDepartments, useGetWaitingCases, GetCasesParams
} from "@workspace/api-client-react";
import { Printer, ZoomIn, ZoomOut, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABELS, translate, formatDateAr, calcStayLabel } from "@/lib/constants";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function PrintReports() {
  const now = new Date();
  const [reportDate, setReportDate] = useState(now.toISOString().slice(0, 10));
  const [reportTime, setReportTime] = useState(format(now, "hh:mm"));
  const [reportAmPm, setReportAmPm] = useState<"ص" | "م">(parseInt(format(now, "HH")) < 12 ? "ص" : "م");
  const [fontSize, setFontSize] = useState([12]);
  const [filterDeptId, setFilterDeptId] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<"all" | "servo" | "reception">("all");
  const [showAllDepts, setShowAllDepts] = useState(false);

  const { data: departments } = useGetDepartments();
  const { data: allCases } = useGetCases({ status: "active" } as GetCasesParams);
  const { data: waitingServo } = useGetWaitingCases({ section: "servo", status: "waiting" });
  const { data: waitingReception } = useGetWaitingCases({ section: "reception", status: "waiting" });

  const dateObj = new Date(reportDate + "T12:00:00");
  const dayName = DAYS_AR[dateObj.getDay()];
  const formatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

  const filteredCases = (allCases ?? []).filter(c => {
    if (filterDeptId !== "all" && c.departmentId !== parseInt(filterDeptId)) return false;
    return true;
  });

  const allDepts = departments ?? [];
  const targetDepts = filterDeptId !== "all"
    ? allDepts.filter(d => d.id === parseInt(filterDeptId))
    : allDepts;

  const displayWaitingServo = filterSection === "reception" ? [] : (waitingServo ?? []);
  const displayWaitingReception = filterSection === "servo" ? [] : (waitingReception ?? []);

  const handlePrint = () => window.print();

  const handlePrintDept = (deptId: number) => {
    setFilterDeptId(deptId.toString());
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-4">
      {/* Controls — no-print */}
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">التقرير اليومي</h1>
            <p className="text-muted-foreground text-sm">بيان الحالات اليومي وقوائم الانتظار</p>
          </div>
          <Button className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> طباعة التقرير
          </Button>
        </div>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ التقرير</Label>
                <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوقت</Label>
                <div className="flex gap-1">
                  <Input value={reportTime} onChange={e => setReportTime(e.target.value)}
                    className="h-8 text-sm" placeholder="07:30" />
                  <Select value={reportAmPm} onValueChange={v => setReportAmPm(v as "ص" | "م")}>
                    <SelectTrigger className="h-8 w-14 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ص">ص</SelectItem>
                      <SelectItem value="م">م</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">القسم</Label>
                <Select value={filterDeptId} onValueChange={setFilterDeptId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="كل الأقسام" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأقسام</SelectItem>
                    {allDepts.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">قائمة الانتظار</Label>
                <Select value={filterSection} onValueChange={v => setFilterSection(v as any)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="servo">سيرفو فقط</SelectItem>
                    <SelectItem value="reception">استقبال فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 border-t pt-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider value={fontSize} onValueChange={setFontSize} min={8} max={18} step={1} className="w-40" />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fontSize[0]}px</span>
            </div>
          </CardContent>
        </Card>

        {/* Per-dept print buttons */}
        <div className="flex gap-2 flex-wrap">
          {allDepts.map(d => (
            <Button key={d.id} size="sm" variant="outline" className="gap-1 text-xs"
              onClick={() => handlePrintDept(d.id)}>
              <Printer className="h-3 w-3" /> طباعة {d.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Printable Report */}
      <div
        className="bg-white text-black rounded-lg overflow-hidden shadow-lg print:shadow-none"
        style={{ fontSize: fontSize[0], direction: "rtl", fontFamily: "Arial, sans-serif" }}
      >
        {/* Report Header */}
        <div className="text-center border-b-2 border-black py-4 px-6">
          <h2 className="text-lg font-bold">مستشفى الأطفال التخصصي بالبحيرة</h2>
          <h3 className="font-bold mt-1">التقرير اليومي</h3>
          <p className="text-sm mt-1">
            يوم {dayName} الموافق {formatted} — الساعة: {reportTime} {reportAmPm}
          </p>
        </div>

        <div className="p-4 space-y-6">
          {/* Cases per department */}
          {targetDepts.map(dept => {
            const deptCases = filteredCases.filter(c => c.departmentId === dept.id);
            return (
              <div key={dept.id} className="page-break-inside-avoid">
                <div className="font-bold border-b border-black pb-1 mb-2 flex justify-between">
                  <span>قسم: {dept.name}</span>
                  <span>({deptCases.length} حالة)</span>
                </div>
                {deptCases.length === 0 ? (
                  <p className="text-xs text-center py-2 text-gray-500">لا توجد حالات نشطة في هذا القسم</p>
                ) : (
                  <table className="w-full border-collapse" style={{ fontSize: fontSize[0] }}>
                    <thead>
                      <tr className="bg-gray-100">
                        {["م", "الاسم", "السن", "التشخيص", "التنفس الصناعي", "مدة الإقامة", "MOBE"].map(h => (
                          <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deptCases.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                          <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1">{c.patientName}</td>
                          <td className="border border-gray-300 p-1">{c.age ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{c.diagnosis ?? "—"}</td>
                          <td className="border border-gray-300 p-1">
                            {c.artificialRespiration !== "no" ? translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION) : "—"}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">{calcStayLabel(c.admissionDate)}</td>
                          <td className="border border-gray-300 p-1">{(c as any).mobe ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100">
                        <td colSpan={7} className="border border-gray-400 p-1 text-left font-bold">
                          الإجمالي: {deptCases.length} حالة
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            );
          })}

          {/* Waiting Lists */}
          {(displayWaitingServo.length > 0 || displayWaitingReception.length > 0) && (
            <div>
              <h3 className="font-bold border-b-2 border-black pb-1 mb-3">قوائم الانتظار</h3>
              {displayWaitingServo.length > 0 && (
                <div className="mb-4">
                  <p className="font-bold mb-1">سيرفو (تحويلات) — {displayWaitingServo.length} حالة</p>
                  <table className="w-full border-collapse" style={{ fontSize: fontSize[0] }}>
                    <thead>
                      <tr className="bg-gray-100">
                        {["م", "الاسم", "السن", "التشخيص", "التنفس", "نوع الرعاية", "الكود"].map(h => (
                          <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayWaitingServo.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                          <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1">{c.patientName}</td>
                          <td className="border border-gray-300 p-1">{c.age ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{c.diagnosis ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
                          <td className="border border-gray-300 p-1">{translate(c.careType, LABELS.CARE_TYPES)}</td>
                          <td className="border border-gray-300 p-1">{c.centralRoomRequired ? (c.centralRoomCode || "✓") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {displayWaitingReception.length > 0 && (
                <div>
                  <p className="font-bold mb-1">استقبال / طوارئ — {displayWaitingReception.length} حالة</p>
                  <table className="w-full border-collapse" style={{ fontSize: fontSize[0] }}>
                    <thead>
                      <tr className="bg-gray-100">
                        {["م", "الاسم", "السن", "التشخيص", "التنفس", "نوع الرعاية", "الكود"].map(h => (
                          <th key={h} className="border border-gray-400 p-1 text-right font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayWaitingReception.map((c, i) => (
                        <tr key={c.id} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                          <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1">{c.patientName}</td>
                          <td className="border border-gray-300 p-1">{c.age ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{c.diagnosis ?? "—"}</td>
                          <td className="border border-gray-300 p-1">{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
                          <td className="border border-gray-300 p-1">{translate(c.careType, LABELS.CARE_TYPES)}</td>
                          <td className="border border-gray-300 p-1">{c.centralRoomRequired ? (c.centralRoomCode || "✓") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-300 py-2 text-xs text-gray-500">
          تم طباعة هذا التقرير بواسطة نظام BSCH — {new Date().toLocaleString("ar-EG")}
        </div>
      </div>
    </div>
  );
}
