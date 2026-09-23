import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { exportWordDoc } from "@/lib/word-export";
import { exportPDF, exportPDFDirect } from "@/lib/pdf-export";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ClipboardPlus, Clock3, Edit3, FileDown, FileText, Hospital, Phone, Plus, Printer, Save, Stethoscope, Trash2, UsersRound, Megaphone } from "lucide-react";
import { toast } from "sonner";

type Appointment = { id: number; clinicId: number; patientName: string; age?: string | null; phone?: string | null; appointmentDate: string; appointmentTime?: string | null; queueNumber: number; source: string; status: string; notes?: string | null; clinicName?: string };
type Clinic = { id: number; name: string; specialty?: string | null; doctorName: string; room?: string | null; phone?: string | null; dailyCapacity: number; appointmentDuration: number; isOpen: boolean; appointmentsCount: number; waitingCount: number; appointments: Appointment[] };

const today = () => new Date().toISOString().slice(0, 10);
const statusLabels: Record<string, string> = { waiting: "في الانتظار", called: "تم النداء", in_service: "داخل الكشف", completed: "اكتملت", cancelled: "ملغى" };
const sourceLabels: Record<string, string> = { system: "حجز من النظام", external: "حجز خارجي" };

const emptyClinic = { name: "", specialty: "", doctorName: "", room: "", phone: "", dailyCapacity: 30, appointmentDuration: 15, isOpen: true };
const emptyAppointment = { patientName: "", age: "", phone: "", nationalId: "", appointmentTime: "", source: "system", notes: "" };

export default function OutpatientClinics() {
  const { data: user } = useGetMe();
  const [date, setDate] = useState(today());
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [clinicForm, setClinicForm] = useState<any>(emptyClinic);
  const [appointmentForm, setAppointmentForm] = useState<any>(emptyAppointment);
  const [clinicDialog, setClinicDialog] = useState(false);
  const [appointmentDialog, setAppointmentDialog] = useState(false);
  const [editingClinic, setEditingClinic] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterClinic, setFilterClinic] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const isFounder = Boolean((user as any)?.isFounder);
  const outpatientRole = (user as any)?.outpatientRole as "reception" | "doctor" | "nurse" | undefined;
  const canReception = isFounder || outpatientRole === "reception";
  const canCallNext = isFounder || outpatientRole === "doctor" || outpatientRole === "nurse";

  const load = async () => {
    try { setClinics(await apiGet<Clinic[]>(`/api/outpatient/clinics?date=${date}`)); }
    catch (error: any) { toast.error(error.message || "تعذر تحميل العيادات"); }
  };
  useEffect(() => { void load(); }, [date]);

  const selectedClinic = useMemo(() => clinics.find(c => c.id === selectedClinicId) ?? clinics[0], [clinics, selectedClinicId]);
  const allAppointments = clinics.flatMap(c => c.appointments.map(a => ({ ...a, clinicName: c.name })));
  const filteredAppointments = allAppointments.filter(a => {
    const q = searchText.trim().toLowerCase();
    const matchesText = !q || [a.patientName, a.phone ?? "", a.clinicName, String(a.queueNumber)].some(v => v.toLowerCase().includes(q));
    return matchesText && (filterClinic === "all" || String(a.clinicId) === filterClinic) && (filterStatus === "all" || a.status === filterStatus) && (filterSource === "all" || a.source === filterSource);
  });
  const activeCount = allAppointments.filter(a => !["completed", "cancelled"].includes(a.status)).length;

  const openAddClinic = () => { setEditingClinic(null); setClinicForm({ ...emptyClinic }); setClinicDialog(true); };
  const openEditClinic = (clinic: Clinic) => { setEditingClinic(clinic.id); setClinicForm({ ...clinic }); setClinicDialog(true); };
  const saveClinic = async () => {
    if (!clinicForm.name.trim() || !clinicForm.doctorName.trim()) { toast.error("اكتب اسم العيادة والطبيب"); return; }
    setLoading(true);
    try {
      if (editingClinic) await apiPatch(`/api/outpatient/clinics/${editingClinic}`, clinicForm);
      else await apiPost("/api/outpatient/clinics", clinicForm);
      toast.success(editingClinic ? "تم تعديل العيادة" : "تمت إضافة العيادة"); setClinicDialog(false); await load();
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  };
  const deleteClinic = async (clinic: Clinic) => {
    if (!window.confirm(`حذف عيادة ${clinic.name}؟`)) return;
    try { await apiDelete(`/api/outpatient/clinics/${clinic.id}`); toast.success("تم حذف العيادة"); await load(); }
    catch (error: any) { toast.error(error.message); }
  };
  const openAppointment = (clinic?: Clinic) => {
    if (clinic) setSelectedClinicId(clinic.id);
    setAppointmentForm({ ...emptyAppointment }); setAppointmentDialog(true);
  };
  const saveAppointment = async () => {
    if (!selectedClinic?.id || !appointmentForm.patientName.trim()) { toast.error("اختر العيادة واكتب اسم الحالة"); return; }
    setLoading(true);
    try {
      await apiPost("/api/outpatient/appointments", { ...appointmentForm, clinicId: selectedClinic.id, appointmentDate: date });
      toast.success("تم الحجز وإصدار رقم الحالة"); setAppointmentDialog(false); await load();
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  };
  const updateStatus = async (id: number, status: string) => {
    try { await apiPatch(`/api/outpatient/appointments/${id}`, { status }); await load(); }
    catch (error: any) { toast.error(error.message); }
  };
  const toggleBooking = async (clinic: Clinic) => {
    try { await apiPatch(`/api/outpatient/clinics/${clinic.id}/status`, { isOpen: !clinic.isOpen }); toast.success(clinic.isOpen ? "تم إيقاف الحجز" : "تم استمرار الحجز"); await load(); }
    catch (error: any) { toast.error(error.message); }
  };
  const callNext = async (clinic: Clinic) => {
    try { const next = await apiPost<Appointment>(`/api/outpatient/clinics/${clinic.id}/next`, { date }); toast.success(`الرقم التالي: ${next.queueNumber} — ${next.patientName}`); await load(); }
    catch (error: any) { toast.error(error.message); }
  };
  const printQueue = () => {
    const rows = filteredAppointments.map(a => `<tr><td>${a.queueNumber}</td><td>${a.clinicName}</td><td>${a.patientName}</td><td>${a.appointmentTime ?? "—"}</td><td>${sourceLabels[a.source] ?? a.source}</td><td>${statusLabels[a.status] ?? a.status}</td></tr>`).join("");
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<html dir="rtl"><head><title>كشف العيادات ${date}</title><style>body{font-family:Arial;padding:25px}h2{text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #555;padding:8px;text-align:center}th{background:#e5eefb}</style></head><body><h2>كشف العيادات الخارجية — ${date}</h2><table><tr><th>الرقم</th><th>العيادة</th><th>اسم الحالة</th><th>الوقت</th><th>المصدر</th><th>الحالة</th></tr>${rows}</table><script>window.print()</script></body></html>`); win.document.close();
  };
  const queueHtml = () => `<div class="header"><h2>كشف العيادات الخارجية</h2><p>التاريخ: ${date} — عدد النتائج: ${filteredAppointments.length}</p></div><table border="1"><tr style="background:#d9e1f2"><th>الرقم</th><th>العيادة</th><th>اسم الحالة</th><th>الوقت</th><th>المصدر</th><th>الحالة</th></tr>${filteredAppointments.map(a => `<tr><td>${a.queueNumber}</td><td>${a.clinicName ?? "—"}</td><td>${a.patientName}</td><td>${a.appointmentTime ?? "—"}</td><td>${sourceLabels[a.source] ?? a.source}</td><td>${statusLabels[a.status] ?? a.status}</td></tr>`).join("")}</table>`;
  const exportQueueWord = () => exportWordDoc(queueHtml(), `outpatient-queue-${date}.doc`);
  const exportQueuePdf = () => void exportPDFDirect(queueHtml(), `outpatient-queue-${date}.pdf`);
  const previewQueuePdf = () => exportPDF(queueHtml(), `outpatient-queue-${date}.pdf`);

  return <div className="space-y-5" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Hospital className="text-primary" /> العيادات الخارجية</h1><p className="text-sm text-muted-foreground mt-1">حجوزات منفصلة عن حالات الإقامة — أرقام يومية وتنظيم الدور</p>{outpatientRole && <Badge variant="outline" className="mt-2">{outpatientRole === "reception" ? "استقبال العيادات" : outpatientRole === "doctor" ? "طبيب العيادة" : "تمريض العيادة"}</Badge>}</div>
      <div className="flex items-center gap-2 no-print flex-wrap"><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" /><Button variant="outline" onClick={printQueue} className="gap-2"><Printer className="h-4 w-4" /> طباعة النتائج</Button><Button variant="outline" onClick={exportQueueWord} className="gap-2"><FileText className="h-4 w-4" /> Word</Button><Button variant="outline" onClick={previewQueuePdf} className="gap-2"><FileDown className="h-4 w-4" /> عرض PDF</Button><Button variant="outline" onClick={exportQueuePdf} className="gap-2"><Save className="h-4 w-4" /> حفظ PDF مباشر</Button>{isFounder && <Button onClick={openAddClinic} className="gap-2"><Plus className="h-4 w-4" /> إضافة عيادة</Button>}</div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Stat title="العيادات المفتوحة" value={clinics.filter(c => c.isOpen).length} icon={<Hospital />} /><Stat title="حالات اليوم" value={allAppointments.length} icon={<UsersRound />} /><Stat title="في الانتظار" value={activeCount} icon={<Clock3 />} /><Stat title="آخر رقم صادر" value={Math.max(0, ...allAppointments.map(a => a.queueNumber))} icon={<ClipboardPlus />} /></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clinics.map(clinic => <Card key={clinic.id} className={!clinic.isOpen ? "opacity-65" : "border-primary/40"}><CardHeader className="pb-3"><div className="flex justify-between gap-2"><div><CardTitle className="text-lg">{clinic.name}</CardTitle><p className="text-xs text-muted-foreground mt-1">{clinic.specialty || "عيادة خارجية"} · غرفة {clinic.room || "—"}</p></div><Badge variant={clinic.isOpen ? "default" : "secondary"}>{clinic.isOpen ? "مفتوحة" : "مغلقة"}</Badge></div></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-2 text-sm"><Stethoscope className="h-4 w-4 text-primary" /> د. {clinic.doctorName}</div><div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {clinic.phone || "لا يوجد هاتف"}</div><div className="grid grid-cols-3 rounded-lg bg-muted/50 p-2 text-center text-sm"><div><b className="block text-lg">{clinic.appointmentsCount}</b><span className="text-xs text-muted-foreground">محجوز</span></div><div><b className="block text-lg text-amber-600">{clinic.waitingCount}</b><span className="text-xs text-muted-foreground">بالدور</span></div><div><b className="block text-lg text-primary">{clinic.appointments.at(-1)?.queueNumber ?? 0}</b><span className="text-xs text-muted-foreground">آخر رقم</span></div></div><div className="flex gap-2"><Button className="flex-1 gap-2" onClick={() => openAppointment(clinic)} disabled={!clinic.isOpen || !canReception}><ClipboardPlus className="h-4 w-4" /> حجز حالة</Button>{canCallNext && <Button variant="secondary" className="gap-2" onClick={() => callNext(clinic)}><Megaphone className="h-4 w-4" /> التالي</Button>}{canReception && <Button variant="outline" onClick={() => toggleBooking(clinic)}>{clinic.isOpen ? "إيقاف الحجز" : "استمرار الحجز"}</Button>}{isFounder && <><Button size="icon" variant="outline" onClick={() => openEditClinic(clinic)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => deleteClinic(clinic)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}</div></CardContent></Card>)}{clinics.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-12 text-center text-muted-foreground">لا توجد عيادات مضافة بعد. يمكن للمؤسس إضافة أول عيادة من زر «إضافة عيادة».</CardContent></Card>}</div>
    <Card className="no-print"><CardHeader className="pb-3"><CardTitle className="text-base">بحث وتصنيف كشف الحجوزات</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-4"><Input placeholder="اسم الحالة، الهاتف أو الرقم" value={searchText} onChange={e => setSearchText(e.target.value)} /><Select value={filterClinic} onValueChange={setFilterClinic}><SelectTrigger><SelectValue placeholder="كل العيادات" /></SelectTrigger><SelectContent><SelectItem value="all">كل العيادات</SelectItem>{clinics.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue placeholder="كل الحالات" /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={filterSource} onValueChange={setFilterSource}><SelectTrigger><SelectValue placeholder="كل مصادر الحجز" /></SelectTrigger><SelectContent><SelectItem value="all">كل مصادر الحجز</SelectItem>{Object.entries(sourceLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><p className="text-xs text-muted-foreground mt-2">عدد النتائج: {filteredAppointments.length} من {allAppointments.length}</p></CardContent></Card>
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> كشف حجوزات {date}</CardTitle><span className="text-sm text-muted-foreground">يتم ترتيب الأرقام تلقائيًا لكل عيادة ولكل يوم</span></div></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-right">الرقم</th><th className="p-2 text-right">العيادة / الطبيب</th><th className="p-2 text-right">اسم الحالة</th><th className="p-2 text-right">الوقت</th><th className="p-2 text-right">المصدر</th><th className="p-2 text-right">الحالة</th><th className="p-2 text-right no-print">إجراء</th></tr></thead><tbody>{filteredAppointments.sort((a,b) => a.queueNumber-b.queueNumber).map(a => <tr key={a.id} className="border-b hover:bg-muted/30"><td className="p-2"><Badge variant="outline" className="text-base">{a.queueNumber}</Badge></td><td className="p-2"><b>{a.clinicName}</b><span className="block text-xs text-muted-foreground">{clinics.find(c => c.id === a.clinicId)?.doctorName}</span></td><td className="p-2"><b>{a.patientName}</b><span className="block text-xs text-muted-foreground">{a.phone || "بدون هاتف"}</span></td><td className="p-2">{a.appointmentTime || "بدون موعد محدد"}</td><td className="p-2">{sourceLabels[a.source] ?? a.source}</td><td className="p-2"><Badge variant={a.status === "completed" ? "secondary" : a.status === "cancelled" ? "destructive" : "default"}>{statusLabels[a.status] ?? a.status}</Badge></td><td className="p-2 no-print"><Select value={a.status} onValueChange={value => updateStatus(a.id, value)}><SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></td></tr>)}{filteredAppointments.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">لا توجد نتائج مطابقة للبحث</td></tr>}</tbody></table></CardContent></Card>
    <Dialog open={clinicDialog} onOpenChange={setClinicDialog}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editingClinic ? "تعديل العيادة" : "إضافة عيادة خارجية"}</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label="اسم العيادة" value={clinicForm.name} onChange={v => setClinicForm({...clinicForm,name:v})} required /><Field label="اسم الطبيب" value={clinicForm.doctorName} onChange={v => setClinicForm({...clinicForm,doctorName:v})} required /><Field label="التخصص" value={clinicForm.specialty} onChange={v => setClinicForm({...clinicForm,specialty:v})} /><Field label="الغرفة" value={clinicForm.room} onChange={v => setClinicForm({...clinicForm,room:v})} /><Field label="هاتف الحجز" value={clinicForm.phone} onChange={v => setClinicForm({...clinicForm,phone:v})} /><Field label="السعة اليومية" type="number" value={clinicForm.dailyCapacity} onChange={v => setClinicForm({...clinicForm,dailyCapacity:Number(v)})} /><Field label="مدة الموعد بالدقائق" type="number" value={clinicForm.appointmentDuration} onChange={v => setClinicForm({...clinicForm,appointmentDuration:Number(v)})} /><label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={clinicForm.isOpen} onChange={e => setClinicForm({...clinicForm,isOpen:e.target.checked})} /> العيادة مفتوحة للحجز</label></div><DialogFooter><Button variant="outline" onClick={() => setClinicDialog(false)}>إلغاء</Button><Button onClick={saveClinic} disabled={loading}>حفظ العيادة</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={appointmentDialog} onOpenChange={setAppointmentDialog}><DialogContent dir="rtl"><DialogHeader><DialogTitle>حجز حالة في {selectedClinic?.name}</DialogTitle></DialogHeader><div className="rounded-lg bg-primary/10 p-3 text-sm">سيصدر للحالة رقم <b className="text-lg">{(selectedClinic?.appointments.at(-1)?.queueNumber ?? 0) + 1}</b> في كشف يوم {date}.</div><div className="grid gap-3 sm:grid-cols-2"><Field label="اسم الحالة" value={appointmentForm.patientName} onChange={v => setAppointmentForm({...appointmentForm,patientName:v})} required /><Field label="السن" value={appointmentForm.age} onChange={v => setAppointmentForm({...appointmentForm,age:v})} /><Field label="الهاتف" value={appointmentForm.phone} onChange={v => setAppointmentForm({...appointmentForm,phone:v})} /><Field label="الرقم القومي" value={appointmentForm.nationalId} onChange={v => setAppointmentForm({...appointmentForm,nationalId:v})} /><Field label="وقت الحجز" type="time" value={appointmentForm.appointmentTime} onChange={v => setAppointmentForm({...appointmentForm,appointmentTime:v})} /><div><Label>طريقة الحجز</Label><Select value={appointmentForm.source} onValueChange={v => setAppointmentForm({...appointmentForm,source:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">عن طريق النظام بالمستشفى</SelectItem><SelectItem value="external">حجز خارجي / هاتف / استقبال</SelectItem></SelectContent></Select></div><Field label="ملاحظات" value={appointmentForm.notes} onChange={v => setAppointmentForm({...appointmentForm,notes:v})} /></div><DialogFooter><Button variant="outline" onClick={() => setAppointmentDialog(false)}>إلغاء</Button><Button onClick={saveAppointment} disabled={loading}>تأكيد الحجز</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: any; onChange: (value: string) => void; type?: string; required?: boolean }) { return <div><Label>{label}{required ? " *" : ""}</Label><Input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} /></div>; }
function Stat({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) { return <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><b className="text-2xl">{value}</b></div><div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div></CardContent></Card>; }
