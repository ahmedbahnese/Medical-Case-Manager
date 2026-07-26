import { useState } from "react";
import { Link } from "wouter";
import { useGetCases, useUpdateCase } from "@workspace/api-client-react";
import { LogOut, Search, RotateCcw, ArrowLeft, FileDown, FileText, Printer } from "lucide-react";
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
import { exportPDF } from "@/lib/pdf-export";
import { exportWordDoc } from "@/lib/word-export";
import { useAppSettings } from "@/contexts/settings-context";
import { ReportWatermark } from "@/components/report-watermark";

function buildDischargeHtml(cases: any[], hospitalName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const rows = cases.map((c, i) => {
    const dis = c.dischargeDate ? new Date(c.dischargeDate) : new Date(c.updatedAt);
    return `<tr>
      <td style="text-align:center">${i+1}</td>
      <td><strong>${c.patientName}</strong></td>
      <td>${c.fileNumber ?? "—"}</td>
      <td>${c.age ?? "—"}</td>
      <td>${c.diagnosis ?? "—"}</td>
      <td>${formatDateAr(c.admissionDate)}</td>
      <td>${formatDateAr(dis.toISOString())}</td>
      <td>${c.departmentName ?? "—"}</td>
    </tr>`;
  }).join("");
  return `
    <div class="header">
      <h2>${hospitalName}</h2>
      <h3>سجل الخروج</h3>
      <p>${dateStr} — عدد الحالات: ${cases.length}</p>
    </div>
    <table border="1">
      <tr style="background:#d9e1f2">
        <th>م</th><th>الاسم</th><th>رقم الملف</th><th>السن</th><th>التشخيص</th>
        <th>تاريخ الدخول</th><th>تاريخ الخروج</th><th>القسم</th>
      </tr>
      ${rows}
    </table>`;
}

export default function DischargeHistory() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(true);
  const { hospital_name, logo_base64, watermark_enabled } = useAppSettings();

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

  const handleExportPDF = () => {
    const html = buildDischargeHtml(visible, hospital_name);
    exportPDF(html, `discharge-history-${new Date().toISOString().slice(0,10)}.pdf`, logo_base64, watermark_enabled ? logo_base64 : null);
  };

  const handleExportWord = () => {
    const html = buildDischargeHtml(visible, hospital_name);
    exportWordDoc(html, `discharge-history-${new Date().toISOString().slice(0,10)}.doc`);
  };

  return (
    <ReportWatermark enabled={watermark_enabled} logo={logo_base64} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LogOut className="h-8 w-8 text-muted-foreground" />
            سجل الخروج
          </h1>
          <p className="text-muted-foreground mt-1">
            الحالات التي تم تسجيل خروجها — يُمسح التاريخ القديم (أكثر من شهر) تلقائياً
          </p>
        </div>
        <div className="flex gap-2 flex-wrap no-print">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportWord}>
            <FileText className="h-4 w-4" /> Word
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>
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
                  <TableHead>سبب الخروج</TableHead>
                  <TableHead>التشخيص</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-20 text-muted-foreground">جاري التحميل...</TableCell>
                  </TableRow>
                ) : visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
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
                    <TableCell className="text-sm">
                      {c.dischargeReason === "internal_transfer" ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                          ⇄ تحويل داخلي
                          {c.transferDestination && (
                            <span className="text-xs text-muted-foreground font-normal">→ {c.transferDestination}</span>
                          )}
                        </span>
                      ) : c.dischargeReason === "transferred" ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          ↗ تحويل خارجي
                          {c.transferDestination && (
                            <span className="text-xs text-muted-foreground font-normal">→ {c.transferDestination}</span>
                          )}
                        </span>
                      ) : (
                        <span>{translate(c.dischargeReason ?? "", LABELS.DISCHARGE_REASON) || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">{c.diagnosis ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Link href={`/case/${c.id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                          عرض <ArrowLeft className="h-3 w-3" />
                        </Link>
                        {canReadmit(c) && c.dischargeReason !== "internal_transfer" && (
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
                        {(!canReadmit(c) || c.dischargeReason === "internal_transfer") && (
                          <span className="text-xs text-muted-foreground">
                            {c.dischargeReason === "internal_transfer" ? "تم التحويل" : "انتهت مهلة الإعادة"}
                          </span>
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
    </ReportWatermark>
  );
}
