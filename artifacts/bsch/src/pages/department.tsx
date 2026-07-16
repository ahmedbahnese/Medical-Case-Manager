import { useLocation, useParams } from "wouter";
import { useGetDepartment, useUpdateCase } from "@workspace/api-client-react";
import { Activity, ArrowLeft, Bed, Calendar, FileText, Plus, User, AlertTriangle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LABELS, translate } from "@/lib/constants";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

export default function DepartmentDetail() {
  const { id } = useParams();
  const departmentId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [searchFilter, setSearchFilter] = useState("");
  
  const { data: dept, isLoading } = useGetDepartment(departmentId);
  const updateCase = useUpdateCase();

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-xl" /></div>;
  }

  if (!dept) return <div>القسم غير موجود</div>;

  const filteredCases = dept.cases?.filter(c => 
    c.patientName.includes(searchFilter) || 
    (c.fileNumber && c.fileNumber.includes(searchFilter)) ||
    (c.diagnosis && c.diagnosis.includes(searchFilter))
  ) || [];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-sm cursor-pointer hover:text-primary" onClick={() => setLocation("/dashboard")}>الرئيسية</span>
            <span>/</span>
            <span className="text-sm">الأقسام</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {dept.name}
            <Badge variant="outline" className="text-base py-1 px-3 border-primary/50 text-primary">
              {translate(dept.departmentType, LABELS.DEPARTMENT_TYPES)}
            </Badge>
          </h1>
          {dept.description && <p className="text-muted-foreground mt-2">{dept.description}</p>}
        </div>

        <Button onClick={() => setLocation(`/add-case?departmentId=${dept.id}`)}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة حالة لهذا القسم
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full"><Bed className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الأسرة</p>
              <p className="text-2xl font-bold">{dept.capacity}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-full"><Activity className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">الأسرة المشغولة</p>
              <p className="text-2xl font-bold">{dept.activeCasesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-full"><Activity className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">الأسرة الشاغرة</p>
              <p className="text-2xl font-bold">{dept.capacity - dept.activeCasesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-destructive/20 p-3 rounded-full"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">حالات حرجة</p>
              <p className="text-2xl font-bold text-destructive">
                {dept.cases?.filter(c => c.status === 'critical').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>قائمة الحالات النشطة</CardTitle>
            <CardDescription>جميع المرضى المقيمين حالياً بالقسم</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالاسم أو التشخيص أو رقم الملف..." 
              className="pr-9"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>رقم الملف</TableHead>
                <TableHead>اسم المريض</TableHead>
                <TableHead>التشخيص</TableHead>
                <TableHead>تاريخ الدخول</TableHead>
                <TableHead>التنفس الصناعي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    لا يوجد حالات مطابقة للبحث أو القسم فارغ
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((c) => (
                  <TableRow 
                    key={c.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/case/${c.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{c.fileNumber || '-'}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {c.patientName}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={c.diagnosis || ''}>
                      {c.diagnosis || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.admissionDate), 'PP', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {c.artificialRespiration !== 'no' ? (
                        <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30">
                          {translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        c.status === 'critical' ? 'destructive' :
                        c.status === 'active' ? 'default' :
                        c.status === 'recovering' ? 'success' : 'secondary'
                      }>
                        {translate(c.status, LABELS.STATUS)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
