import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock3, Copy, Hospital, MapPin, RefreshCw, Stethoscope, UsersRound } from "lucide-react";

type QueueStatus = { clinicName: string; specialty?: string | null; doctorName: string; room?: string | null; appointmentDate: string; appointmentTime?: string | null; queueNumber: number; currentQueueNumber: number; remaining: number; clinicOpen: boolean; status: string; statusLabel: string; expired?: boolean };

export default function PatientQueuePortal({ token }: { token: string }) {
  const [data, setData] = useState<QueueStatus | null>(null);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const baseUrl = window.location.origin;
  const followUrl = `${baseUrl}/q/${token}`;

  const load = async () => {
    try { setError(""); setData(await apiGet<QueueStatus>(`/api/outpatient/public/${encodeURIComponent(token)}`)); }
    catch (e: any) { setError(e.message || "انتهى رابط المتابعة أو غير صالح"); }
  };
  useEffect(() => { void load(); QRCode.toDataURL(followUrl, { width: 220, margin: 2, errorCorrectionLevel: "M" }).then(setQr).catch(() => undefined); }, [token]);
  useEffect(() => {
    const events = new EventSource(`/api/outpatient/public/${encodeURIComponent(token)}/stream`);
    events.onmessage = event => { try { setData(JSON.parse(event.data)); setError(""); } catch { /* ignore malformed event */ } };
    events.onerror = () => events.close();
    return () => events.close();
  }, [token]);
  const date = useMemo(() => data?.appointmentDate ? new Date(`${data.appointmentDate}T12:00:00`).toLocaleDateString("ar-EG") : "—", [data?.appointmentDate]);

  if (error || !data) return <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><Card className="max-w-lg w-full text-center"><CardHeader><Hospital className="mx-auto h-12 w-12 text-primary" /><CardTitle>{error || "جاري تحميل بيانات الدور"}</CardTitle></CardHeader><CardContent><Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</Button></CardContent></Card></main>;

  return <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-4 sm:p-8"><div className="max-w-3xl mx-auto space-y-5"><header className="text-center"><Hospital className="mx-auto h-10 w-10 text-primary" /><h1 className="text-2xl font-bold mt-2">متابعة دور العيادات</h1><p className="text-muted-foreground">هذه الصفحة تعرض حالة حجزك فقط ولا تعرض أي بيانات طبية</p></header><Card className="overflow-hidden border-primary/30 shadow-lg"><CardHeader className="bg-primary text-primary-foreground"><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-2xl">{data.clinicName}</CardTitle><p className="mt-1 opacity-90">{data.specialty || "عيادة خارجية"}</p></div><Badge variant={data.clinicOpen ? "secondary" : "destructive"}>{data.clinicOpen ? "العيادة مفتوحة" : "الحجز متوقف"}</Badge></div></CardHeader><CardContent className="p-5 space-y-5"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center"><div className="rounded-xl bg-blue-50 p-4"><UsersRound className="mx-auto h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground mt-1">رقم دورك</p><b className="text-3xl text-primary">{data.queueNumber}</b></div><div className="rounded-xl bg-amber-50 p-4"><Clock3 className="mx-auto h-5 w-5 text-amber-600" /><p className="text-xs text-muted-foreground mt-1">يتم كشف</p><b className="text-3xl text-amber-700">{data.currentQueueNumber || "—"}</b></div><div className="rounded-xl bg-emerald-50 p-4"><UsersRound className="mx-auto h-5 w-5 text-emerald-600" /><p className="text-xs text-muted-foreground mt-1">متبقي أمامك</p><b className="text-3xl text-emerald-700">{data.remaining}</b></div><div className="rounded-xl bg-slate-100 p-4"><Badge className="mx-auto">الحالة</Badge><p className="font-semibold mt-3">{data.statusLabel}</p></div></div><div className="grid sm:grid-cols-2 gap-3 text-sm"><p className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> الطبيب: <b>{data.doctorName}</b></p><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> الغرفة: <b>{data.room || "غير محددة"}</b></p><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> التاريخ: <b>{date}</b></p><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> الموعد: <b>{data.appointmentTime || "بدون موعد محدد"}</b></p></div><div className="border-t pt-4 flex flex-col sm:flex-row items-center gap-4"><div className="text-center"><p className="font-semibold">احتفظ بهذا الرابط لمتابعة دورك</p><p className="text-xs text-muted-foreground break-all mt-1">{followUrl}</p><Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => navigator.clipboard?.writeText(followUrl)}><Copy className="h-4 w-4" /> نسخ الرابط</Button></div>{qr && <img src={qr} alt="QR Code لمتابعة الدور" className="w-36 h-36 border rounded-lg" />}</div></CardContent></Card><p className="text-center text-xs text-muted-foreground">يتم تحديث الرقم تلقائيًا عند نداء الحالات التالية. صلاحية الرابط مرتبطة بيوم الحجز.</p></div></main>;
}
