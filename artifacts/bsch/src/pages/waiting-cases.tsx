import { useState } from "react";
import { Link } from "wouter";
import { useGetWaitingCases, useUpdateWaitingCase, useDeleteWaitingCase, WaitingCaseUpdateStatus } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Users, Clock, CheckCircle2, XCircle, Trash2, ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LABELS, translate } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

export default function WaitingCases() {
  const [section, setSection] = useState<"reception" | "servo">("reception");
  const { data: cases, isLoading, refetch } = useGetWaitingCases({ section, status: "waiting" });
  
  const updateStatus = useUpdateWaitingCase();
  const deleteCase = useDeleteWaitingCase();
  const { toast } = useToast();

  const handleAction = (id: number, status: WaitingCaseUpdateStatus) => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "تم التحديث", description: `تم تغيير حالة الطلب بنجاح` });
          refetch();
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if(confirm("هل أنت متأكد من حذف هذا السجل من قائمة الانتظار؟")) {
      deleteCase.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "تم الحذف" });
          refetch();
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          قوائم الانتظار
        </h1>
        <p className="text-muted-foreground mt-2">إدارة حالات الطوارئ والاستقبال المنتظرة للأسرة الشاغرة</p>
      </div>

      <Tabs defaultValue="reception" onValueChange={(v) => setSection(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="reception" className="text-base h-full">طوارئ / استقبال</TabsTrigger>
          <TabsTrigger value="servo" className="text-base h-full">سيرفو (تحويلات)</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
          ) : cases?.length === 0 ? (
            <div className="text-center py-20 bg-muted/10 border border-dashed rounded-xl">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-xl font-medium text-muted-foreground">القائمة فارغة</p>
              <p className="text-sm text-muted-foreground mt-2">لا يوجد مرضى في الانتظار حالياً لهذا القسم</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cases?.map((c) => (
                <Card key={c.id} className="border-r-4 border-r-warning overflow-hidden">
                  <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{c.patientName}</h3>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> منذ {format(new Date(c.createdAt), 'hh:mm a', { locale: ar })}</span>
                            {c.age && <span>• العمر: {c.age}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">
                            مطلوب: {translate(c.careType, LABELS.DEPARTMENT_TYPES)}
                          </Badge>
                          {c.centralRoomRequired && (
                            <Badge variant="destructive" className="flex gap-1">
                              <ShieldAlert className="h-3 w-3" /> غرفة مركزية {c.centralRoomCode && `(${c.centralRoomCode})`}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 bg-muted/20 p-3 rounded-md border text-sm">
                        {c.diagnosis && <p><span className="font-medium text-foreground">التشخيص:</span> {c.diagnosis}</p>}
                        <div className="flex gap-6 mt-2">
                          <p><span className="font-medium text-foreground">تنفس صناعي:</span> {translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</p>
                          {c.parentPhone && <p><span className="font-medium text-foreground">رقم التواصل:</span> <span dir="ltr">{c.parentPhone}</span></p>}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/10 p-6 border-t md:border-t-0 md:border-r flex md:flex-col items-center justify-center gap-3 w-full md:w-48 shrink-0">
                      <Button 
                        onClick={() => handleAction(c.id, "admitted")}
                        className="w-full bg-success text-success-foreground hover:bg-success/90"
                      >
                        <CheckCircle2 className="h-4 w-4 ml-2" /> تم الدخول
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleAction(c.id, "cancelled")}
                        className="w-full text-muted-foreground"
                      >
                        <XCircle className="h-4 w-4 ml-2" /> إلغاء / تحويل
                      </Button>
                      <div className="w-full h-px bg-border my-1 hidden md:block" />
                      <Button 
                        variant="ghost" 
                        onClick={() => handleDelete(c.id)}
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 ml-2" /> مسح السجل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
