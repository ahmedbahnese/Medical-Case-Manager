import { useState } from "react";
import { Link } from "wouter";
import { useGetCases, GetCasesParams } from "@workspace/api-client-react";
import { Search as SearchIcon, Filter, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LABELS, translate } from "@/lib/constants";

export default function Search() {
  const [params, setParams] = useState<GetCasesParams>({});
  
  const { data: cases, isLoading, refetch } = useGetCases(params);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SearchIcon className="h-8 w-8 text-primary" />
          البحث المتقدم
        </h1>
        <p className="text-muted-foreground mt-2">البحث في السجلات القديمة والنشطة باستخدام فلاتر متعددة</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" /> محددات البحث
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>اسم المريض</Label>
                <Input 
                  placeholder="جزء من الاسم..." 
                  value={params.patientName || ""} 
                  onChange={e => setParams({...params, patientName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>الرقم القومي</Label>
                <Input 
                  dir="ltr" className="text-right" placeholder="14 رقم..." 
                  value={params.nationalId || ""} 
                  onChange={e => setParams({...params, nationalId: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الملف</Label>
                <Input 
                  dir="ltr" className="text-right" placeholder="MF-..." 
                  value={params.fileNumber || ""} 
                  onChange={e => setParams({...params, fileNumber: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-border/50">
              <div className="space-y-2">
                <Label>حالة الملف</Label>
                <Select value={params.status || "all"} onValueChange={v => setParams({...params, status: v === "all" ? undefined : v as any})}>
                  <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.entries(LABELS.STATUS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تنفس صناعي</Label>
                <Select value={params.artificialRespiration || "all"} onValueChange={v => setParams({...params, artificialRespiration: v === "all" ? undefined : v as any})}>
                  <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="ml-2" onClick={() => setParams({})}>
                تفريغ الحقول
              </Button>
              <Button type="submit" className="w-32 gap-2" disabled={isLoading}>
                {isLoading ? "جاري البحث..." : <><SearchIcon className="h-4 w-4"/> بحث</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {cases && (
        <Card>
          <CardHeader>
            <CardTitle>النتائج ({cases.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>رقم الملف / القومي</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>التنفس</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">لا توجد نتائج تطابق بحثك</TableCell>
                    </TableRow>
                  ) : (
                    cases.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.patientName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {c.fileNumber}<br/>{c.nationalId}
                        </TableCell>
                        <TableCell>{c.departmentName}</TableCell>
                        <TableCell>{translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'discharged' ? 'outline' : c.status === 'critical' ? 'destructive' : 'default'}>
                            {translate(c.status, LABELS.STATUS)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/case/${c.id}`} className="text-primary hover:underline text-sm flex items-center">
                            عرض <ArrowLeft className="h-3 w-3 mr-1" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
