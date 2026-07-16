import { useState } from "react";
import { useGetBackups, useCreateBackup } from "@workspace/api-client-react";
import { Database, DownloadCloud, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Backup() {
  const [name, setName] = useState("");
  const { data: backups, isLoading, refetch } = useGetBackups();
  const createBackup = useCreateBackup();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!name) return;
    createBackup.mutate({ data: { backupName: name } }, {
      onSuccess: () => {
        toast({ title: "تم إنشاء النسخة", description: "تم أخذ نسخة احتياطية من قاعدة البيانات بنجاح" });
        setName("");
        refetch();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-3 rounded-xl">
          <Database className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">النسخ الاحتياطي</h1>
          <p className="text-muted-foreground mt-1">تأمين بيانات المستشفى والمرضى</p>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>إنشاء نسخة جديدة</CardTitle>
          <CardDescription>ينصح بأخذ نسخة احتياطية بشكل يومي لحفظ بيانات الحالات</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 items-center">
          <div className="flex-1">
            <Input 
              placeholder="اسم النسخة (مثال: نسخة نهاية الأسبوع)..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <Button onClick={handleCreate} disabled={!name || createBackup.isPending}>
            <Plus className="h-4 w-4 ml-2" /> 
            {createBackup.isPending ? "جاري الإنشاء..." : "إنشاء الآن"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل النسخ السابقة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم النسخة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>عدد السجلات المؤرشفة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">لا يوجد أي نسخ احتياطية حتى الآن</TableCell>
                </TableRow>
              ) : (
                backups?.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.backupName}</TableCell>
                    <TableCell className="text-muted-foreground" dir="ltr" style={{textAlign:'right'}}>
                      {format(new Date(b.createdAt), 'PP p', { locale: ar })}
                    </TableCell>
                    <TableCell>{b.recordCount} سجل</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <DownloadCloud className="h-4 w-4" /> تحميل
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
