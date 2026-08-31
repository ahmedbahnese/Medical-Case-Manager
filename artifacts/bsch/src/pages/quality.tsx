import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Plus, ShieldAlert, Target } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const impacts = ["Near Miss", "No Harm", "Significant", "Sentinel"];
const categories = ["السجلات الطبية", "الحرائق والسلامة", "الأشعة", "السرية والخصوصية", "الأمن", "إعطاء الدواء", "المختبر", "رعاية وسلامة المريض", "أخرى"];

type Ovr = { id: number; ovrNumber: string; eventDate: string; category: string; eventType: string; description: string; impact: string; status: string; reporterName: string };
type Dashboard = { kpis: { totalOvr: number; nearMiss: number; significant: number; sentinel: number; openCapa: number; overdueCapa: number } };

function Metric({ title, value, icon: Icon, tone = "text-primary" }: { title: string; value: number; icon: any; tone?: string }) {
  return <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="text-2xl font-bold mt-1">{value}</p></div><Icon className={`h-8 w-8 ${tone}`} /></CardContent></Card>;
}

export default function Quality() {
  const [ovr, setOvr] = useState<Ovr[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [form, setForm] = useState({ eventDate: new Date().toISOString().slice(0, 16), location: "", category: "", eventType: "", description: "", impact: "No Harm", patientRelated: false, patientName: "", hospitalNumber: "", attendingDoctor: "", immediateAction: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try { const [reports, stats] = await Promise.all([apiGet<Ovr[]>("/api/quality/ovr"), apiGet<Dashboard>("/api/quality/dashboard")]); setOvr(reports); setDashboard(stats); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل مركز الجودة"); }
  };
  useEffect(() => { void refresh(); }, []);
  const recent = useMemo(() => ovr.slice(0, 8), [ovr]);
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!form.location || !form.category || !form.eventType || !form.description) { toast.error("أكمل الحقول الأساسية للبلاغ"); return; }
    setSaving(true);
    try { await apiPost("/api/quality/ovr", form); toast.success("تم إرسال البلاغ بنجاح"); setForm({ ...form, location: "", eventType: "", description: "", patientName: "", hospitalNumber: "", attendingDoctor: "", immediateAction: "", notes: "" }); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ البلاغ"); } finally { setSaving(false); }
  };

  return <div className="p-4 md:p-6 space-y-6" dir="rtl">
    <div><h1 className="text-2xl font-bold">مركز الجودة والسلامة</h1><p className="text-muted-foreground mt-1">إدارة البلاغات والتحقيقات والإجراءات التصحيحية من مكان واحد.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Metric title="إجمالي OVR" value={dashboard?.kpis.totalOvr ?? 0} icon={AlertTriangle} />
      <Metric title="Near Miss" value={dashboard?.kpis.nearMiss ?? 0} icon={Target} tone="text-blue-600" />
      <Metric title="Significant" value={dashboard?.kpis.significant ?? 0} icon={ShieldAlert} tone="text-amber-600" />
      <Metric title="Sentinel" value={dashboard?.kpis.sentinel ?? 0} icon={ShieldAlert} tone="text-red-600" />
      <Metric title="CAPA مفتوح" value={dashboard?.kpis.openCapa ?? 0} icon={ClipboardCheck} tone="text-purple-600" />
      <Metric title="CAPA متأخر" value={dashboard?.kpis.overdueCapa ?? 0} icon={CheckCircle2} tone="text-red-600" />
    </div>
    <Tabs defaultValue="new">
      <TabsList><TabsTrigger value="new">إضافة OVR</TabsTrigger><TabsTrigger value="reports">البلاغات ({ovr.length})</TabsTrigger><TabsTrigger value="capa">CAPA</TabsTrigger></TabsList>
      <TabsContent value="new"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />بلاغ OVR جديد</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4"><div><Label>تاريخ ووقت الحدث</Label><Input type="datetime-local" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} /></div><div><Label>مكان الحدث</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="القسم أو المكان" /></div><div><Label>الأثر</Label><Select value={form.impact} onValueChange={(v) => set("impact", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{impacts.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="grid md:grid-cols-2 gap-4"><div><Label>تصنيف الحدث</Label><Select value={form.category} onValueChange={(v) => set("category", v)}><SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger><SelectContent>{categories.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div><Label>نوع الحدث</Label><Input value={form.eventType} onChange={(e) => set("eventType", e.target.value)} placeholder="مثال: إعطاء دواء خاطئ" /></div></div>
        <div><Label>وصف الحدث</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.patientRelated} onChange={(e) => set("patientRelated", e.target.checked)} /> الحدث متعلق بمريض</label>
        {form.patientRelated && <div className="grid md:grid-cols-3 gap-4 rounded-lg bg-muted/40 p-3"><div><Label>اسم المريض</Label><Input value={form.patientName} onChange={(e) => set("patientName", e.target.value)} /></div><div><Label>رقم الملف</Label><Input value={form.hospitalNumber} onChange={(e) => set("hospitalNumber", e.target.value)} /></div><div><Label>الطبيب المعالج</Label><Input value={form.attendingDoctor} onChange={(e) => set("attendingDoctor", e.target.value)} /></div></div>}
        <div className="grid md:grid-cols-2 gap-4"><div><Label>الإجراء الفوري</Label><Textarea value={form.immediateAction} onChange={(e) => set("immediateAction", e.target.value)} /></div><div><Label>ملاحظات إضافية</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div></div>
        <Button onClick={submit} disabled={saving}>{saving ? "جارٍ الإرسال..." : "إرسال البلاغ"}</Button>
      </CardContent></Card></TabsContent>
      <TabsContent value="reports"><Card><CardHeader><CardTitle>آخر البلاغات</CardTitle></CardHeader><CardContent><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b text-right"><th className="p-2">الرقم</th><th className="p-2">التاريخ</th><th className="p-2">التصنيف</th><th className="p-2">الأثر</th><th className="p-2">الحالة</th></tr></thead><tbody>{recent.map((row) => <tr key={row.id} className="border-b"><td className="p-2 font-medium">{row.ovrNumber}</td><td className="p-2">{new Date(row.eventDate).toLocaleString("ar-EG")}</td><td className="p-2">{row.category}</td><td className="p-2">{row.impact}</td><td className="p-2">{row.status}</td></tr>)}{recent.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد بلاغات بعد</td></tr>}</tbody></table></div></CardContent></Card></TabsContent>
      <TabsContent value="capa"><Card><CardHeader><CardTitle>الإجراءات التصحيحية والوقائية</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">يمكن لمسؤول الجودة والمؤسس إدارة CAPA من خلال API ومسار التحديث التالي. ستتم إضافة شاشة الإدارة التفصيلية في التحسين المرحلي التالي.</p></CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
