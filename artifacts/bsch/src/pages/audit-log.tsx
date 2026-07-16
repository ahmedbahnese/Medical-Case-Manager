import { useState, useEffect } from "react";
import { ClipboardList, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { formatDateTimeAr } from "@/lib/constants";

const SETTINGS_PASSWORD = "@Bahnasy";

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  entityName: string | null;
  details: string | null;
  performedBy: string | null;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  "إضافة حالة": "bg-green-500/20 text-green-700",
  "تعديل حالة": "bg-blue-500/20 text-blue-700",
  "حذف حالة": "bg-red-500/20 text-red-700",
  "تسجيل خروج": "bg-orange-500/20 text-orange-700",
  "إضافة لقائمة الانتظار": "bg-yellow-500/20 text-yellow-700",
  "تم الدخول": "bg-green-500/20 text-green-700",
};

export default function AuditLog() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUnlock = () => {
    if (pw === SETTINGS_PASSWORD) {
      setUnlocked(true);
      loadLogs();
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await apiGet<AuditLog[]>("/api/audit-logs?limit=200");
      setLogs(data);
    } catch (e: any) {
      toast.error("حدث خطأ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-xl">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">سجل العمليات</h1>
            <p className="text-muted-foreground text-sm">يتطلب كلمة مرور الإعدادات</p>
          </div>
        </div>

        <Card className="border-primary/20 shadow-md">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>كلمة مرور الإعدادات</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUnlock()}
                  dir="ltr"
                  className="pr-10"
                />
                <button type="button" className="absolute left-3 top-2.5 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={handleUnlock}>
              <Lock className="h-4 w-4 ml-2" /> عرض السجل
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            سجل العمليات
          </h1>
          <p className="text-muted-foreground mt-1">جميع العمليات التي تمت على النظام</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>المستخدم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-20 text-muted-foreground">جاري التحميل...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">لا يوجد سجل عمليات حتى الآن</TableCell>
                  </TableRow>
                ) : logs.map(log => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTimeAr(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionColors[log.action] ?? "bg-muted"}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.entityType}</TableCell>
                    <TableCell className="text-sm font-medium">{log.entityName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details ?? "—"}</TableCell>
                    <TableCell className="text-xs">{log.performedBy ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
