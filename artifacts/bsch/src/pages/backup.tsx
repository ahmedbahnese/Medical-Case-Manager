import { useState } from "react";
import { useGetBackups, useCreateBackup } from "@workspace/api-client-react";
import { Database, DownloadCloud, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiDelete, getDownloadUrl } from "@/lib/api";

export default function Backup() {
  const [name, setName] = useState("");
  const { data: backups, isLoading, refetch } = useGetBackups();
  const createBackup = useCreateBackup();

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("أدخل اسماً للنسخة");
      return;
    }
    createBackup.mutate({ data: { backupName: name } }, {
      onSuccess: () => {
        toast.success("تم إنشاء النسخة الاحتياطية");
        setName("");
        refetch();
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  const handleDelete = async (id: number, backupName: string) => {
    try {
      await apiDelete(`/api/backups/${id}`);
      toast.success(`تم حذف نسخة "${backupName}"`);
      refetch();
    } catch (e: any) {
      toast.error("حدث خطأ: " + e.message);
    }
  };

  const handleDownload = (id: number, backupName: string) => {
    const url = getDownloadUrl(`/api/backups/${id}/download`);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bsch-backup-${backupName}.json`;
    a.click();
    toast.success("جاري تحميل النسخة...");
  };

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
          <CardDescription>يُنصح بأخذ نسخة احتياطية يومياً</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="اسم النسخة (مثال: نسخة نهاية الأسبوع)..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>
          <ConfirmDialog
            trigger={
              <Button disabled={!name.trim() || createBackup.isPending}>
                <Plus className="h-4 w-4 ml-2" />
                {createBackup.isPending ? "جاري الإنشاء..." : "إنشاء الآن"}
              </Button>
            }
            title="تأكيد إنشاء نسخة احتياطية"
            description={`هل تريد إنشاء نسخة باسم "${name}"؟`}
            confirmLabel="نعم، إنشاء"
            variant="default"
            onConfirm={handleCreate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل النسخ الاحتياطية</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم النسخة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>عدد السجلات</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-20 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : backups?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">لا يوجد أي نسخ احتياطية حتى الآن</TableCell>
                </TableRow>
              ) : backups?.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.backupName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm" dir="ltr" style={{ textAlign: "right" }}>
                    {format(new Date(b.createdAt), "PP p", { locale: ar })}
                  </TableCell>
                  <TableCell>{b.recordCount} سجل</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownload(b.id, b.backupName)}>
                        <DownloadCloud className="h-4 w-4" /> تحميل
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="حذف النسخة الاحتياطية"
                        description={`هل أنت متأكد من حذف نسخة "${b.backupName}"؟ لا يمكن التراجع.`}
                        confirmLabel="نعم، احذف"
                        onConfirm={() => handleDelete(b.id, b.backupName)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
