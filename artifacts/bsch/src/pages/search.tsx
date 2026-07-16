import { useState } from "react";
import { Link } from "wouter";
import { useGetCases, useGetDepartments, GetCasesParams } from "@workspace/api-client-react";
import { Search as SearchIcon, Filter, ArrowLeft, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LABELS, translate, formatDateAr, calcStayLabel } from "@/lib/constants";

export default function Search() {
  const [params, setParams] = useState<GetCasesParams & { departmentId?: number }>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: cases, isLoading, refetch } = useGetCases(params, { enabled: submitted });
  const { data: departments } = useGetDepartments();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    refetch();
  };

  const handleReset = () => {
    setParams({});
    setSubmitted(false);
  };

  const p = (k: keyof typeof params, v: any) => setParams(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SearchIcon className="h-8 w-8 text-primary" />
          البحث المتقدم
        </h1>
        <p className="text-muted-foreground mt-1">البحث في السجلات القديمة والنشطة</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> معايير البحث
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>اسم المريض</Label>
                <Input placeholder="جزء من الاسم..."
                  value={params.patientName || ""}
                  onChange={e => p("patientName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>الرقم القومي</Label>
                <Input dir="ltr" className="text-right" placeholder="14 رقم..."
                  value={params.nationalId || ""}
                  onChange={e => p("nationalId", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الملف</Label>
                <Input dir="ltr" className="text-right" placeholder="MF-..."
                  value={params.fileNumber || ""}
                  onChange={e => p("fileNumber", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div className="space-y-1.5">
                <Label>القسم</Label>
                <Select value={params.departmentId?.toString() || "all"} onValueChange={v => p("departmentId", v === "all" ? undefined : parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأقسام</SelectItem>
                    {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>حالة الملف</Label>
                <Select value={params.status || "all"} onValueChange={v => p("status", v === "all" ? undefined : v as any)}>
                  <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.entries(LABELS.STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>تنفس صناعي</Label>
                <Select value={params.artificialRespiration || "all"} onValueChange={v => p("artificialRespiration", v === "all" ? undefined : v as any)}>
                  <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="gap-2" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" /> تفريغ
              </Button>
              <Button type="submit" className="w-32 gap-2" disabled={isLoading}>
                {isLoading ? "جاري البحث..." : <><SearchIcon className="h-4 w-4" /> بحث</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {submitted && cases && (
        <Card>
          <CardHeader>
            <CardTitle>النتائج ({cases.length} سجل)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>رقم الملف</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>تاريخ الدخول</TableHead>
                    <TableHead>مدة الإقامة</TableHead>
                    <TableHead>التنفس</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                        لا توجد نتائج تطابق بحثك
                      </TableCell>
                    </TableRow>
                  ) : cases.map(c => (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">{c.patientName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.fileNumber || "—"}</TableCell>
                      <TableCell>{c.departmentName}</TableCell>
                      <TableCell className="text-sm">{formatDateAr(c.admissionDate)}</TableCell>
                      <TableCell className="text-sm">{calcStayLabel(c.admissionDate)}</TableCell>
                      <TableCell className="text-xs">{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "discharged" ? "outline" : c.status === "critical" ? "destructive" : "default"}>
                          {translate(c.status, LABELS.STATUS)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/case/${c.id}`}
                          className="text-primary hover:underline text-sm flex items-center gap-1 whitespace-nowrap">
                          عرض / تعديل <ArrowLeft className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
