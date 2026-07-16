import { useState } from "react";
import { Link } from "wouter";
import { useGetCases, useUpdateCase } from "@workspace/api-client-react";
import { LogOut, Search, RotateCcw, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LABELS, translate, formatDateAr, calcStayLabel } from "@/lib/constants";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function DischargeHistory() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(true);

  const { data: allCases, isLoading, refetch } = useGetCases({ status: "discharged" } as any);
  const updateCase = useUpdateCase();

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = allCases?.filter(c => {
    if (!search) return true;
    return c.patientName.includes(search)
      || (c.fileNumber && c.fileNumber.includes(search))
      || (c.nationalId && c.nationalId.includes(search));
  }) ?? [];

  // Filter out cases older than 1 month
  const visible = filtered.filter(c => {
    const dis = c.dischargeDate ? new Date(c.dischargeDate) : new Date(c.updatedAt);
    return dis >= oneMonthAgo;
  });

  const canReadmit = (c: any) => {
    const dis = c.dischargeDate ? new Date(c.dischargeDate) : new Date(c.updatedAt);
    return dis >= oneDayAgo;
  };

  const handleReadmit = (id: number, name: string) => {
    updateCase.mutate({ id, data: { status: "active" } as any }, {
      onSuccess: () => {
        toast.success(`تمت إعادة قبول "${name}" كحالة نشطة`);
        refetch();
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <LogOut className="h-8 w-8 text-muted-foreground" />
          سجل الخروج
        </h1>
        <p className="text-muted-foreground mt-1">
          الحالات التي تم تسجيل خروجها — يُمسح التاريخ القديم (أكثر من شهر) تلقائياً
        </p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>بحث (الاسم أو رقم الملف أو القومي)</Label>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-9"
                  placeholder="ابحث..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" onClick={() => setSearch("")} className="gap-2">
              <RotateCcw className="h-4 w-4" /> مسح
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            سجل الخروج ({visible.length} حالة)
            <span className="text-xs text-muted-foreground font-normal mr-2">
              — يمكن إعادة القبول خلال 24 ساعة من الخروج فقط
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>تاريخ الدخول</TableHead>
                  <TableHead>تاريخ الخروج</TableHead>
                  <TableHead>مدة الإقامة</TableHead>
                  <TableHead>التشخيص</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-20 text-muted-foreground">جاري التحميل...</TableCell>
                  </TableRow>
                ) : visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      لا توجد حالات خروج مسجلة في آخر شهر
                    </TableCell>
                  </TableRow>
                ) : visible.map(c => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{c.patientName}</TableCell>
                    <TableCell className="text-sm">{c.departmentName}</TableCell>
                    <TableCell className="text-sm">{formatDateAr(c.admissionDate)}</TableCell>
                    <TableCell className="text-sm">{formatDateAr(c.dischargeDate)}</TableCell>
                    <TableCell className="text-sm">{calcStayLabel(c.admissionDate)}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{c.diagnosis ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Link href={`/case/${c.id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                          عرض <ArrowLeft className="h-3 w-3" />
                        </Link>
                        {canReadmit(c) && (
                          <ConfirmDialog
                            trigger={
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                                <RotateCcw className="h-3 w-3" /> إعادة قبول
                              </Button>
                            }
                            title="إعادة قبول الحالة"
                            description={`هل تريد إعادة قبول "${c.patientName}" كحالة نشطة؟`}
                            confirmLabel="نعم، أعد القبول"
                            variant="default"
                            onConfirm={() => handleReadmit(c.id, c.patientName)}
                          />
                        )}
                        {!canReadmit(c) && (
                          <span className="text-xs text-muted-foreground">انتهت مهلة الإعادة</span>
                        )}
                      </div>
                    </TableCell>
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
