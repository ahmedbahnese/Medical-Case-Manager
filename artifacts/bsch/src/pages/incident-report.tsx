import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, Printer, Save, Edit, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDateTimeAr } from "@/lib/constants";

interface IncidentCase {
  id: number;
  name: string;
  age: string;
  address: string;
  diagnosis: string;
  hospital: string;
  followup: string;
}

interface IncidentReport {
  id: number;
  incidentType: string;
  incidentLocation: string;
  reportDate: string;
  reportDay: string;
  reportTime: string;
  totalInjured: number;
  totalDeaths: number;
  hospitalsTransferredTo: string;
  cases: IncidentCase[];
  createdAt: string;
}

function emptyCase(id: number): IncidentCase {
  return { id, name: "", age: "", address: "", diagnosis: "", hospital: "", followup: "" };
}

interface ReportForm {
  id?: number;
  incidentType: string;
  incidentLocation: string;
  reportDate: string;
  reportDay: string;
  reportTime: string;
  totalInjured: number;
  totalDeaths: number;
  hospitalsTransferredTo: string;
  cases: IncidentCase[];
}

function emptyForm(): ReportForm {
  const now = new Date();
  return {
    incidentType: "",
    incidentLocation: "",
    reportDate: now.toISOString().slice(0, 10),
    reportDay: new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(now),
    reportTime: now.toTimeString().slice(0, 5),
    totalInjured: 0,
    totalDeaths: 0,
    hospitalsTransferredTo: "",
    cases: [emptyCase(1), emptyCase(2), emptyCase(3)],
  };
}

function ReportPrintView({ report }: { report: ReportForm }) {
  const dateStr = report.reportDate;
  return (
    <div className="bg-white text-black p-8 print:p-4 text-sm" dir="rtl" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h2 className="text-xl font-bold">تقرير الحادث</h2>
      </div>

      <div className="space-y-3 mb-6 text-sm">
        <div className="flex gap-8 flex-wrap">
          <p><strong>➢ نوع الحادث:</strong> {report.incidentType || "—"}</p>
          <p><strong>➢ مكان وقوع الحادث:</strong> {report.incidentLocation || "—"}</p>
        </div>
        <p>
          <strong>➢ وقت إبلاغ الحادث:</strong>{" "}
          {dateStr} &nbsp; الموافق: يوم {report.reportDay} &nbsp; الساعة: {report.reportTime} م
        </p>
        <div className="flex gap-8">
          <p><strong>➢ إجمالي عدد المصابين:</strong> ({report.totalInjured})</p>
          <p><strong>➢ إجمالي عدد الوفيات:</strong> ({report.totalDeaths})</p>
        </div>
        {report.hospitalsTransferredTo && (
          <p><strong>➢ المستشفيات التي تم التحويل إليها:</strong> {report.hospitalsTransferredTo}</p>
        )}
      </div>

      <h3 className="font-bold text-center border border-black p-2 mb-2">بيان بأسماء الحالات</h3>
      <table className="w-full border-collapse text-xs mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1.5 text-center">م</th>
            <th className="border border-black p-1.5">الاسم</th>
            <th className="border border-black p-1.5">السن</th>
            <th className="border border-black p-1.5">العنوان</th>
            <th className="border border-black p-1.5">التشخيص</th>
            <th className="border border-black p-1.5">مستشفى الإخلاء</th>
            <th className="border border-black p-1.5">المتابعة</th>
          </tr>
        </thead>
        <tbody>
          {report.cases.map((c, i) => (
            <tr key={c.id}>
              <td className="border border-black p-1.5 text-center">{i + 1}</td>
              <td className="border border-black p-1.5">{c.name}</td>
              <td className="border border-black p-1.5">{c.age}</td>
              <td className="border border-black p-1.5">{c.address}</td>
              <td className="border border-black p-1.5">{c.diagnosis}</td>
              <td className="border border-black p-1.5">{c.hospital}</td>
              <td className="border border-black p-1.5">{c.followup}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signatures */}
      <div className="flex justify-between mt-12 text-xs text-center">
        <div>
          <div className="w-40 border-b border-black mb-1 h-6" />
          <p className="font-bold">مدير إدارة الرعاية الحرجة و العاجلة</p>
          <p>د / أحمد حراز</p>
        </div>
        <div>
          <div className="w-40 border-b border-black mb-1 h-6" />
          <p className="font-bold">مدير عام الطب العلاجي</p>
          <p>د / سعيد عوض</p>
        </div>
        <div>
          <div className="w-40 border-b border-black mb-1 h-6" />
          <p className="font-bold">وكيل الوزارة</p>
          <p>أ.د / إسلام عساف</p>
        </div>
      </div>
    </div>
  );
}

export default function IncidentReportPage() {
  const [mode, setMode] = useState<"list" | "new" | "view">("list");
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [currentReport, setCurrentReport] = useState<ReturnType<typeof emptyForm> & { id?: number }>(emptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await apiGet<IncidentReport[]>("/api/incident-reports");
      setReports(data);
    } catch { }
  };

  const handleSave = async () => {
    if (!currentReport.incidentType || !currentReport.incidentLocation) {
      toast.error("نوع الحادث والمكان مطلوبان");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...currentReport,
        reportDate: new Date(currentReport.reportDate).toISOString(),
        cases: currentReport.cases.filter(c => c.name.trim()),
      };
      if (currentReport.id) {
        await apiPatch(`/api/incident-reports/${currentReport.id}`, payload);
        toast.success("تم تحديث التقرير");
      } else {
        const saved = await apiPost<IncidentReport>("/api/incident-reports", payload);
        setCurrentReport({ ...currentReport, id: saved.id });
        toast.success("تم حفظ التقرير وإضافة الحالات لقائمة الانتظار");
      }
      setIsEditing(false);
      setShowPrint(true);
      loadReports();
    } catch (e: any) {
      toast.error("حدث خطأ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addCase = () => {
    const maxId = Math.max(0, ...currentReport.cases.map(c => c.id));
    setCurrentReport(prev => ({ ...prev, cases: [...prev.cases, emptyCase(maxId + 1)] }));
  };

  const removeCase = (id: number) => {
    setCurrentReport(prev => ({ ...prev, cases: prev.cases.filter(c => c.id !== id) }));
  };

  const updateCase = (id: number, field: keyof IncidentCase, value: string) => {
    setCurrentReport(prev => ({
      ...prev,
      cases: prev.cases.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const f = (k: keyof typeof currentReport, v: any) =>
    setCurrentReport(prev => ({ ...prev, [k]: v }));

  const startNew = () => {
    setCurrentReport(emptyForm());
    setIsEditing(true);
    setShowPrint(false);
    setMode("new");
  };

  const viewReport = (r: IncidentReport) => {
    setCurrentReport({
      id: r.id,
      incidentType: r.incidentType,
      incidentLocation: r.incidentLocation,
      reportDate: r.reportDate.slice(0, 10),
      reportDay: r.reportDay ?? "",
      reportTime: r.reportTime ?? "",
      totalInjured: r.totalInjured,
      totalDeaths: r.totalDeaths,
      hospitalsTransferredTo: r.hospitalsTransferredTo ?? "",
      cases: r.cases.length > 0 ? r.cases : [emptyCase(1), emptyCase(2), emptyCase(3)],
    });
    setIsEditing(false);
    setShowPrint(true);
    setMode("view");
  };

  if (mode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              بيانات الحوادث
            </h1>
            <p className="text-muted-foreground mt-1">تسجيل وإدارة تقارير الحوادث</p>
          </div>
          <Button className="gap-2" onClick={startNew}>
            <Plus className="h-4 w-4" /> تقرير حادث جديد
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نوع الحادث</TableHead>
                  <TableHead>المكان</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المصابين</TableHead>
                  <TableHead>الوفيات</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      لا توجد تقارير حوادث حتى الآن
                    </TableCell>
                  </TableRow>
                ) : reports.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => viewReport(r)}>
                    <TableCell className="font-medium">{r.incidentType}</TableCell>
                    <TableCell>{r.incidentLocation}</TableCell>
                    <TableCell className="text-sm">{formatDateTimeAr(r.reportDate)}</TableCell>
                    <TableCell>{r.totalInjured}</TableCell>
                    <TableCell>{r.totalDeaths}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">عرض ←</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
            <ArrowLeft className="h-4 w-4 ml-1" /> رجوع
          </Button>
          <h1 className="text-2xl font-bold">
            {currentReport.id ? "تقرير حادث" : "تقرير حادث جديد"}
          </h1>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" /> تعديل
            </Button>
          )}
          {isEditing && (
            <Button className="gap-2" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4" /> {loading ? "جاري الحفظ..." : "حفظ التقرير"}
            </Button>
          )}
          {showPrint && (
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          )}
        </div>
      </div>

      {/* Form / Print Preview */}
      {isEditing ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">بيانات الحادث</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>نوع الحادث *</Label>
                <Input value={currentReport.incidentType} onChange={e => f("incidentType", e.target.value)} placeholder="مثال: حادث مروري" />
              </div>
              <div className="space-y-1.5">
                <Label>مكان وقوع الحادث *</Label>
                <Input value={currentReport.incidentLocation} onChange={e => f("incidentLocation", e.target.value)} placeholder="المكان" />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الإبلاغ</Label>
                <Input type="date" value={currentReport.reportDate} onChange={e => f("reportDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>اليوم</Label>
                <Input value={currentReport.reportDay} onChange={e => f("reportDay", e.target.value)} placeholder="الاثنين" />
              </div>
              <div className="space-y-1.5">
                <Label>الساعة</Label>
                <Input type="time" value={currentReport.reportTime} onChange={e => f("reportTime", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>إجمالي المصابين</Label>
                  <Input type="number" min={0} value={currentReport.totalInjured} onChange={e => f("totalInjured", parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>إجمالي الوفيات</Label>
                  <Input type="number" min={0} value={currentReport.totalDeaths} onChange={e => f("totalDeaths", parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>المستشفيات التي تم التحويل إليها</Label>
                <Input value={currentReport.hospitalsTransferredTo} onChange={e => f("hospitalsTransferredTo", e.target.value)} placeholder="أسماء المستشفيات مفصولة بفاصلة" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">بيان الحالات</h3>
                <Button variant="outline" size="sm" className="gap-1" onClick={addCase}>
                  <Plus className="h-4 w-4" /> إضافة حالة
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      {["م", "الاسم", "السن", "العنوان", "التشخيص", "مستشفى الإخلاء", "المتابعة", ""].map(h => (
                        <th key={h} className="border p-2 text-right font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.cases.map((c, i) => (
                      <tr key={c.id}>
                        <td className="border p-1.5 text-center text-muted-foreground">{i + 1}</td>
                        {(["name", "age", "address", "diagnosis", "hospital", "followup"] as const).map(field => (
                          <td key={field} className="border p-1">
                            <Input value={c[field]} onChange={e => updateCase(c.id, field, e.target.value)}
                              className="h-7 text-xs border-0 focus-visible:ring-0 bg-transparent" />
                          </td>
                        ))}
                        <td className="border p-1 text-center">
                          <button onClick={() => removeCase(c.id)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="print:shadow-none shadow-md rounded-lg overflow-hidden">
          <ReportPrintView report={currentReport} />
        </div>
      )}
    </div>
  );
}
