import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { useAppSettings } from "@/contexts/settings-context";

interface QualityStats {
  totalOvr: number;
  openOvr: number;
  overdueCapa: number;
  byStatus: Array<{ status: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  monthlyVisits: Array<{ month: string; count: number }>;
  departmentVisits?: Array<{ departmentId: number; departmentName: string; count: number }>;
  dischargeByReason?: Array<{ reason: string; count: number }>;
  dischargeByDepartment?: Array<{ departmentName: string; count: number }>;
  respirationPeriods?: { daily: Array<{ period: string; count: number }>; weekly: Array<{ period: string; count: number }>; monthly: Array<{ period: string; count: number }> };
}

const statusLabels: Record<string, string> = { new: "جديد", under_review: "تحت المراجعة", investigating: "تحت التحقيق", corrective_action: "إجراء تصحيحي", verification: "بانتظار التحقق", closed: "مغلق" };
const severityLabels: Record<string, string> = { near_miss: "كاد أن يحدث", no_harm: "بدون ضرر", low: "ضرر بسيط", moderate: "ضرر متوسط", severe: "ضرر شديد", sentinel: "حدث جسيم" };
const dischargeLabels: Record<string, string> = { improved: "تحسن", request: "خروج حسب الطلب", death: "وفاة", transferred: "تحويل خارجي", internal_transfer: "تحويل داخلي", "غير محدد": "غير محدد" };

function StatCard({ title, value, icon: Icon, tone }: { title: string; value: number; icon: typeof AlertTriangle; tone: string }) {
  return <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="text-2xl font-bold mt-1">{value}</p></div><div className={`rounded-full p-3 ${tone}`}><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

export default function QualityDashboard() {
  const { hospital_name } = useAppSettings();
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setStats(await apiGet<QualityStats>("/api/quality/dashboard")); } catch (e: any) { setError(e?.message ?? "تعذر تحميل لوحة الجودة"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  if (loading) return <div className="p-8 text-center text-muted-foreground">جار تحميل لوحة مسؤول الجودة...</div>;
  if (error) return <Card><CardContent className="p-8 text-center"><p className="text-destructive mb-4">{error}</p><Button onClick={load}><RefreshCw className="h-4 w-4 ml-2" />إعادة المحاولة</Button></CardContent></Card>;
  if (!stats) return null;
  const maxVisits = Math.max(...stats.monthlyVisits.map(x => x.count), 1);
  const periodRows = stats.respirationPeriods ?? { daily: [], weekly: [], monthly: [] };
  return <div className="space-y-5 animate-in fade-in duration-300" dir="rtl">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />لوحة مسؤول الجودة</h1><p className="text-xs text-muted-foreground">{hospital_name} — OVR وCAPA والتردد</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 ml-1" />تحديث</Button><Button size="sm" asChild><Link href="/ovr-management">إدارة بلاغات OVR</Link></Button></div></div>
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4"><StatCard title="إجمالي بلاغات OVR" value={stats.totalOvr} icon={AlertTriangle} tone="bg-red-100 text-red-700" /><StatCard title="البلاغات المفتوحة" value={stats.openOvr} icon={Clock3} tone="bg-amber-100 text-amber-700" /><StatCard title="CAPA متأخرة" value={stats.overdueCapa} icon={AlertTriangle} tone="bg-orange-100 text-orange-700" /><StatCard title="البلاغات المغلقة" value={Math.max(stats.totalOvr - stats.openOvr, 0)} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" /></div>
    <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">حالة البلاغات</CardTitle></CardHeader><CardContent className="space-y-3">{stats.byStatus.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بلاغات بعد</p> : stats.byStatus.map(x => <div key={x.status} className="flex items-center justify-between"><span>{statusLabels[x.status] ?? x.status}</span><Badge variant="secondary">{x.count}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">الخطورة</CardTitle></CardHeader><CardContent className="space-y-3">{stats.bySeverity.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات</p> : stats.bySeverity.map(x => <div key={x.severity} className="flex items-center justify-between"><span>{severityLabels[x.severity] ?? x.severity}</span><Badge variant="outline">{x.count}</Badge></div>)}</CardContent></Card></div>
    <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">تردد الأقسام</CardTitle></CardHeader><CardContent className="space-y-2">{(stats.departmentVisits ?? []).map(x => <div key={x.departmentId} className="flex justify-between border-b pb-1"><span>{x.departmentName}</span><Badge>{x.count}</Badge></div>)}{!(stats.departmentVisits ?? []).length && <p className="text-sm text-muted-foreground">لا توجد بيانات</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">تردد التنفس الصناعي</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-2"><div><p className="text-xs text-muted-foreground">يومي</p><p className="text-xl font-bold">{periodRows.daily[0]?.count ?? 0}</p></div><div><p className="text-xs text-muted-foreground">أسبوعي</p><p className="text-xl font-bold">{periodRows.weekly[0]?.count ?? 0}</p></div><div><p className="text-xs text-muted-foreground">شهري</p><p className="text-xl font-bold">{periodRows.monthly.at(-1)?.count ?? 0}</p></div></CardContent></Card></div>
    <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">خروج الحالات حسب السبب</CardTitle></CardHeader><CardContent className="space-y-2">{(stats.dischargeByReason ?? []).map(x => <div key={x.reason} className="flex justify-between border-b pb-1"><span>{dischargeLabels[x.reason] ?? x.reason}</span><Badge>{x.count}</Badge></div>)}{!(stats.dischargeByReason ?? []).length && <p className="text-sm text-muted-foreground">لا توجد حالات خروج</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">خروج الحالات حسب القسم</CardTitle></CardHeader><CardContent className="space-y-2">{(stats.dischargeByDepartment ?? []).map(x => <div key={x.departmentName} className="flex justify-between border-b pb-1"><span>{x.departmentName}</span><Badge>{x.count}</Badge></div>)}{!(stats.dischargeByDepartment ?? []).length && <p className="text-sm text-muted-foreground">لا توجد حالات خروج</p>}</CardContent></Card></div>
    <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">أكثر أنواع OVR تكرارًا</CardTitle></CardHeader><CardContent className="space-y-3">{stats.byType.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات</p> : stats.byType.sort((a,b) => b.count-a.count).map(x => <div key={x.type} className="flex items-center justify-between"><span>{x.type}</span><Badge>{x.count}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />التردد الشهري للحالات</CardTitle></CardHeader><CardContent>{stats.monthlyVisits.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حالات مسجلة</p> : <div className="space-y-3">{stats.monthlyVisits.map(x => <div key={x.month} className="flex items-center gap-2"><span className="w-20 text-xs">{x.month}</span><div className="h-5 rounded bg-primary/15 flex-1 overflow-hidden"><div className="h-full rounded bg-primary" style={{ width: `${Math.max((x.count / maxVisits) * 100, 4)}%` }} /></div><span className="w-8 text-left text-sm font-semibold">{x.count}</span></div>)}</div>}</CardContent></Card></div>
  </div>;
}
