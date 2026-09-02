import { useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck, Lock, Save, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api";
import { toast } from "sonner";

interface OvrReport {
  id: number; reportNumber: string; eventDate: string; eventTime?: string; department: string; location: string;
  eventType: string; patientName?: string; fileNumber?: string; hospitalSupervision?: string;
  administrativeManager?: string; severity: string; description: string; immediateAction?: string;
  reporterName: string; reporterRole?: string; status: string; investigationSummary?: string; rootCause?: string;
  correctiveAction?: string; preventiveAction?: string; actionOwner?: string; investigationDate?: string;
  dueDate?: string; verificationNotes?: string; investigatorName?: string; closedBy?: string; closedAt?: string;
}

const emptyInvestigation = { status: "under_review", investigatorName: "", investigationDate: new Date().toISOString().slice(0, 10), investigationSummary: "", rootCause: "", correctiveAction: "", preventiveAction: "", actionOwner: "", dueDate: "", verificationNotes: "", closedBy: "" };
const statusLabels: Record<string, string> = { new: "جديد", under_review: "قيد التحقيق", action_required: "إجراء مطلوب", closed: "مغلق" };
const severityLabels: Record<string, string> = { no_harm: "دون ضرر", low: "ضرر بسيط", moderate: "ضرر متوسط", severe: "ضرر شديد", critical: "حدث جسيم" };

export default function OvrManagementPage() {
  const [reports, setReports] = useState<OvrReport[]>([]);
  const [selected, setSelected] = useState<OvrReport | null>(null);
  const [form, setForm] = useState(emptyInvestigation);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const load = async () => {
    setLoading(true);
    try { setReports(await apiGet<OvrReport[]>("/api/ovr-reports")); }
    catch (e: any) { toast.error(e?.message || "تعذر تحميل بلاغات OVR"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const open = (report: OvrReport) => {
    setSelected(report);
    setForm({ status: report.status || "under_review", investigatorName: report.investigatorName || "", investigationDate: report.investigationDate?.slice(0, 10) || new Date().toISOString().slice(0, 10), investigationSummary: report.investigationSummary || "", rootCause: report.rootCause || "", correctiveAction: report.correctiveAction || "", preventiveAction: report.preventiveAction || "", actionOwner: report.actionOwner || "", dueDate: report.dueDate?.slice(0, 10) || "", verificationNotes: report.verificationNotes || "", closedBy: report.closedBy || "" });
  };
  const save = async () => {
    if (!selected) return;
    if (form.status === "closed" && !form.closedBy.trim()) { toast.error("اسم مسؤول الإغلاق مطلوب عند غلق البلاغ"); return; }
    setSaving(true);
    try {
      const updated = await apiPatch<OvrReport>(`/api/ovr-reports/${selected.id}`, { ...form, closedAt: form.status === "closed" ? new Date().toISOString() : null });
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r)); setSelected(updated); toast.success("تم حفظ تحقيق OVR");
    } catch (e: any) { toast.error(e?.message || "تعذر حفظ التحقيق"); }
    finally { setSaving(false); }
  };
  if (selected) return <div className="container mx-auto p-4 max-w-5xl space-y-5" dir="rtl">
    <Button variant="ghost" onClick={() => setSelected(null)}><ArrowRight className="ml-2 h-4 w-4" /> رجوع إلى بلاغات OVR</Button>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="text-primary" /> بلاغ OVR رقم {selected.reportNumber}</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3 text-sm"><p><b>المبلّغ:</b> {selected.reporterName}</p><p><b>صفة المبلّغ:</b> {selected.reporterRole || "—"}</p><p><b>تاريخ الواقعة:</b> {selected.eventDate?.slice(0, 10)}</p><p><b>القسم:</b> {selected.department}</p><p><b>المكان:</b> {selected.location}</p><p><b>نوع الواقعة:</b> {selected.eventType}</p><p><b>المريض:</b> {selected.patientName || "—"}</p><p><b>رقم الملف:</b> {selected.fileNumber || "—"}</p><p><b>الخطورة:</b> {severityLabels[selected.severity] || selected.severity}</p></div>
      <div className="grid gap-3 md:grid-cols-2"><div><Label>وصف البلاغ</Label><Textarea value={selected.description} readOnly rows={5} /></div><div><Label>الإجراء الفوري</Label><Textarea value={selected.immediateAction || ""} readOnly rows={5} /></div></div>
      <div className="border-t pt-4"><h2 className="font-bold mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> التحقيق والإجراءات التصحيحية والوقائية</h2><div className="grid gap-4 md:grid-cols-2"><div><Label>حالة البلاغ</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div><Label>مسؤول التحقيق</Label><Input value={form.investigatorName} onChange={e => set("investigatorName", e.target.value)} /></div><div><Label>تاريخ التحقيق</Label><Input type="date" value={form.investigationDate} onChange={e => set("investigationDate", e.target.value)} /></div><div><Label>مسؤول الإجراء</Label><Input value={form.actionOwner} onChange={e => set("actionOwner", e.target.value)} /></div><div className="md:col-span-2"><Label>ملخص التحقيق</Label><Textarea value={form.investigationSummary} onChange={e => set("investigationSummary", e.target.value)} rows={3} /></div><div><Label>السبب الجذري</Label><Textarea value={form.rootCause} onChange={e => set("rootCause", e.target.value)} rows={3} /></div><div><Label>الإجراء التصحيحي</Label><Textarea value={form.correctiveAction} onChange={e => set("correctiveAction", e.target.value)} rows={3} /></div><div><Label>الإجراء الوقائي</Label><Textarea value={form.preventiveAction} onChange={e => set("preventiveAction", e.target.value)} rows={3} /></div><div><Label>ملاحظات التحقيق والتحقق</Label><Textarea value={form.verificationNotes} onChange={e => set("verificationNotes", e.target.value)} rows={3} /></div><div><Label>تاريخ استحقاق الإجراء</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>{form.status === "closed" && <div><Label>اسم مسؤول الإغلاق *</Label><Input value={form.closedBy} onChange={e => set("closedBy", e.target.value)} /></div>}</div></div>
      <Button onClick={save} disabled={saving} className="w-full"><Save className="ml-2 h-4 w-4" />{saving ? "جارٍ الحفظ..." : "حفظ التحقيق"}</Button>
    </CardContent></Card>
  </div>;
  return <div className="container mx-auto p-4 max-w-6xl space-y-5" dir="rtl"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="text-primary" /> إدارة بلاغات OVR</h1><p className="text-muted-foreground mt-1">هذه الصفحة مخصصة لبلاغات OVR والتحقيق فيها فقط، ولا تعرض بيانات الحوادث.</p></div><Button variant="outline" onClick={load}>تحديث</Button></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="p-3 text-right">رقم البلاغ</th><th className="p-3 text-right">القسم</th><th className="p-3 text-right">النوع</th><th className="p-3 text-right">المبلّغ</th><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الحالة</th><th className="p-3" /></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center">جارٍ التحميل...</td></tr> : reports.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد بلاغات OVR</td></tr> : reports.map(r => <tr key={r.id} className="border-b hover:bg-muted/30"><td className="p-3 font-medium">{r.reportNumber}</td><td className="p-3">{r.department}</td><td className="p-3">{r.eventType}</td><td className="p-3">{r.reporterName}</td><td className="p-3">{r.eventDate?.slice(0, 10)}</td><td className="p-3">{statusLabels[r.status] || r.status}</td><td className="p-3 text-left"><Button size="sm" onClick={() => open(r)}>فتح التحقيق</Button></td></tr>)}</tbody></table></div></CardContent></Card></div>;
}
