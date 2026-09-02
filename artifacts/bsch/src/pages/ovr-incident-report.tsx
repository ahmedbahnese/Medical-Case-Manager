import { useEffect, useState } from "react";
import { ShieldAlert, Save, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";

export default function OvrIncidentReportPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ eventDate: new Date().toISOString().slice(0,10), eventTime: new Date().toTimeString().slice(0,5), department: "", location: "", eventType: "", patientName: "", fileNumber: "", hospitalSupervision: "إشراف المستشفى", administrativeManager: "المدير الإداري", severity: "no_harm", description: "", immediateAction: "" });
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const save = async () => {
    if (!form.department || !form.location || !form.eventType || !form.description) { toast.error("يرجى استكمال القسم والمكان ونوع الواقعة والوصف"); return; }
    setSaving(true);
    try { const r = await apiPost<any>("/api/ovr-reports", form); toast.success(`تم إرسال البلاغ ${r.reportNumber} بنجاح`); setForm(f => ({ ...f, description: "", immediateAction: "" })); }
    catch (e: any) { toast.error(e?.message || "تعذر إرسال البلاغ"); }
    finally { setSaving(false); }
  };
  return <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="text-primary" /> OVR Incident Report</h1><p className="text-muted-foreground mt-1">بلاغ واقعة داخلية للجودة وسلامة المرضى — منفصل عن بيانات الحوادث الواردة</p></div><Button variant="outline" onClick={() => history.back()}><ArrowRight className="ml-2 h-4 w-4" /> رجوع</Button></div>
    <Card><CardHeader><CardTitle>إرسال بلاغ OVR</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <div><Label>تاريخ الواقعة</Label><Input type="date" value={form.eventDate} onChange={e=>set("eventDate",e.target.value)} /></div><div><Label>وقت الواقعة</Label><Input type="time" value={form.eventTime} onChange={e=>set("eventTime",e.target.value)} /></div>
      <div><Label>القسم *</Label><Select value={form.department} onValueChange={v=>set("department",v)}><SelectTrigger><SelectValue placeholder="اختر اسم القسم" /></SelectTrigger><SelectContent>{["الاستقبال","السيرفو","العناية","الداخلي","الجراحة","الحضانات","البيكيو"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>مكان الواقعة *</Label><Input value={form.location} onChange={e=>set("location",e.target.value)} /></div>
      <div><Label>نوع الواقعة *</Label><Select value={form.eventType} onValueChange={v=>set("eventType",v)}><SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger><SelectContent>{["سقوط","دواء","عدوى","تعريف مريض","نقل دم","جهاز أو معدات","شكوى","Near Miss","أخرى"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>اسم المريض (اختياري)</Label><Input value={form.patientName} onChange={e=>set("patientName",e.target.value)} /></div>
      <div><Label>رقم الملف (اختياري)</Label><Input dir="ltr" value={form.fileNumber} onChange={e=>set("fileNumber",e.target.value)} /></div>
      <div><Label>الإشراف</Label><Input value={form.hospitalSupervision} readOnly /></div>
      <div><Label>المدير الإداري</Label><Input value={form.administrativeManager} readOnly /></div>
      <div><Label>درجة الخطورة</Label><Select value={form.severity} onValueChange={v=>set("severity",v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["no_harm","دون ضرر"],["low","ضرر بسيط"],["moderate","ضرر متوسط"],["severe","ضرر شديد"],["critical","حدث جسيم"]].map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div className="md:col-span-2"><Label>وصف الواقعة *</Label><Textarea rows={5} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="اكتب وصفًا محايدًا لما حدث دون اتهامات" /></div><div className="md:col-span-2"><Label>الإجراء الفوري</Label><Textarea rows={3} value={form.immediateAction} onChange={e=>set("immediateAction",e.target.value)} /></div>
      <div className="md:col-span-2"><Button onClick={save} disabled={saving} className="w-full"><Save className="ml-2 h-4 w-4" />{saving ? "جارٍ الإرسال..." : "إرسال OVR Incident Report"}</Button></div>
    </CardContent></Card>
  </div>;
}
