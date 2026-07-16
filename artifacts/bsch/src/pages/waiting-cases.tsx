import { useState } from "react";
import { useGetWaitingCases, useUpdateWaitingCase, useDeleteWaitingCase, useCreateWaitingCase, useGetDepartments, WaitingCaseUpdateStatus } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Users, Clock, CheckCircle2, XCircle, Trash2, ShieldAlert, Plus, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LABELS, translate } from "@/lib/constants";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Section = "reception" | "servo";

const EXIT_REASONS = [
  { value: "improved", label: "تحسن / دخل القسم" },
  { value: "request", label: "خروج حسب الطلب" },
  { value: "transferred", label: "تحويل لمستشفى أخرى" },
  { value: "no_bed", label: "رفض (لا يوجد سرير)" },
];

function AddWaitingCaseDialog({ section, onClose, onSuccess }: { section: Section; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    patientName: "",
    age: "",
    diagnosis: "",
    parentPhone: "",
    nationalId: "",
    careType: "intensive_care_high" as string,
    artificialRespiration: "no" as string,
    centralRoomRequired: false,
    centralRoomCode: "",
    section,
  });

  const createCase = useCreateWaitingCase();

  const handleSubmit = () => {
    if (!form.patientName.trim()) {
      toast.error("اسم المريض مطلوب");
      return;
    }
    createCase.mutate({
      data: {
        patientName: form.patientName,
        age: form.age || undefined,
        diagnosis: form.diagnosis || undefined,
        parentPhone: form.parentPhone || undefined,
        nationalId: form.nationalId || undefined,
        careType: form.careType as any,
        artificialRespiration: form.artificialRespiration as any,
        centralRoomRequired: form.centralRoomRequired,
        centralRoomCode: form.centralRoomRequired ? form.centralRoomCode || undefined : undefined,
        section: form.section as any,
      }
    }, {
      onSuccess: () => {
        toast.success("تمت إضافة الحالة لقائمة الانتظار");
        onSuccess();
        onClose();
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  const f = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إضافة حالة انتظار — {translate(section, LABELS.WAITING_SECTION)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto py-2 px-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>اسم المريض *</Label>
              <Input value={form.patientName} onChange={e => f("patientName", e.target.value)} placeholder="الاسم رباعي" />
            </div>
            <div className="space-y-1">
              <Label>السن</Label>
              <Input value={form.age} onChange={e => f("age", e.target.value)} placeholder="مثال: 3 أيام" />
            </div>
            <div className="space-y-1">
              <Label>رقم الهاتف</Label>
              <Input dir="ltr" value={form.parentPhone} onChange={e => f("parentPhone", e.target.value)} placeholder="01X..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>التشخيص</Label>
              <Textarea value={form.diagnosis} onChange={e => f("diagnosis", e.target.value)} className="h-20" />
            </div>
            <div className="space-y-1">
              <Label>نوع الرعاية المطلوبة</Label>
              <Select value={form.careType} onValueChange={v => f("careType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS.CARE_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>التنفس الصناعي</Label>
              <Select value={form.artificialRespiration} onValueChange={v => f("artificialRespiration", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="centralRoom"
                  checked={form.centralRoomRequired}
                  onCheckedChange={v => f("centralRoomRequired", !!v)}
                />
                <Label htmlFor="centralRoom">يحتاج غرفة مركزية</Label>
              </div>
              {form.centralRoomRequired && (
                <Input value={form.centralRoomCode} onChange={e => f("centralRoomCode", e.target.value)} placeholder="كود الغرفة المركزية" />
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={createCase.isPending}>
            {createCase.isPending ? "جاري الإضافة..." : "إضافة للانتظار"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdmitDialog({ waitingCase, onClose, onSuccess }: { waitingCase: any; onClose: () => void; onSuccess: () => void }) {
  const { data: departments } = useGetDepartments();
  const [deptId, setDeptId] = useState("");
  const [exitReason, setExitReason] = useState("admitted");
  const [mode, setMode] = useState<"admit" | "exit">("admit");
  const updateStatus = useUpdateWaitingCase();

  const handleConfirm = () => {
    const status: WaitingCaseUpdateStatus = mode === "admit" ? "admitted" : "cancelled";
    updateStatus.mutate({
      id: waitingCase.id,
      data: { status },
    }, {
      onSuccess: () => {
        toast.success(mode === "admit" ? "تم تسجيل الدخول بنجاح" : "تم تسجيل الخروج");
        onSuccess();
        onClose();
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إجراء — {waitingCase.patientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "admit" ? "default" : "outline"}
              onClick={() => setMode("admit")}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 ml-2" /> دخول القسم
            </Button>
            <Button
              variant={mode === "exit" ? "secondary" : "outline"}
              onClick={() => setMode("exit")}
              className="w-full"
            >
              <XCircle className="h-4 w-4 ml-2" /> خروج / تحويل
            </Button>
          </div>

          {mode === "admit" && (
            <div className="space-y-2">
              <Label>اختر القسم</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue placeholder="اختر القسم المقبول فيه" /></SelectTrigger>
                <SelectContent>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name} (شاغر: {d.capacity - d.activeCasesCount})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">سيتم نقل البيانات تلقائياً لقائمة الحالات النشطة</p>
            </div>
          )}

          {mode === "exit" && (
            <div className="space-y-2">
              <Label>سبب الخروج</Label>
              <Select value={exitReason} onValueChange={setExitReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? "جاري التنفيذ..." : "تأكيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WaitingCases() {
  const [section, setSection] = useState<Section>("reception");
  const [showAdd, setShowAdd] = useState(false);
  const [admitCase, setAdmitCase] = useState<any>(null);

  const { data: cases, isLoading, refetch } = useGetWaitingCases({ section, status: "waiting" });
  const deleteCase = useDeleteWaitingCase();

  const handleDelete = (id: number, name: string) => {
    deleteCase.mutate({ id }, {
      onSuccess: () => {
        toast.success(`تم حذف ${name} من قائمة الانتظار`);
        refetch();
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            قوائم الانتظار
          </h1>
          <p className="text-muted-foreground mt-1">إدارة حالات الطوارئ والاستقبال</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> إضافة حالة انتظار
        </Button>
      </div>

      <Tabs defaultValue="reception" onValueChange={(v) => setSection(v as Section)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
          <TabsTrigger value="reception">استقبال / طوارئ</TabsTrigger>
          <TabsTrigger value="servo">سيرفو (تحويلات)</TabsTrigger>
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
              <p className="text-sm text-muted-foreground mt-2">لا يوجد مرضى في الانتظار حالياً</p>
              <Button className="mt-4 gap-2" onClick={() => setShowAdd(true)} variant="outline">
                <Plus className="h-4 w-4" /> إضافة حالة انتظار
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {cases?.map((c) => (
                <Card key={c.id} className="border-r-4 border-r-yellow-500 overflow-hidden">
                  <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold">{c.patientName}</h3>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(c.createdAt), 'hh:mm a — d MMM', { locale: ar })}
                            </span>
                            {c.age && <span>العمر: {c.age}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 items-end">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 text-xs">
                            {translate(c.careType, LABELS.CARE_TYPES)}
                          </Badge>
                          {c.centralRoomRequired && (
                            <Badge variant="destructive" className="flex gap-1 text-xs">
                              <ShieldAlert className="h-3 w-3" />
                              غرفة مركزية {c.centralRoomCode && `(${c.centralRoomCode})`}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {c.diagnosis && (
                        <p className="text-sm bg-muted/20 p-2 rounded-md border">
                          <span className="font-medium">التشخيص: </span>{c.diagnosis}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>تنفس: {translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</span>
                        {c.parentPhone && <span>هاتف: {c.parentPhone}</span>}
                      </div>
                    </div>

                    <div className="bg-muted/10 p-4 border-t md:border-t-0 md:border-r flex md:flex-col items-center justify-center gap-2 w-full md:w-44 shrink-0">
                      <Button
                        size="sm"
                        className="w-full gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setAdmitCase(c)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> إجراء
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 gap-1">
                            <Trash2 className="h-4 w-4" /> مسح
                          </Button>
                        }
                        title="حذف من قائمة الانتظار"
                        description={`هل أنت متأكد من حذف "${c.patientName}" من قائمة الانتظار؟`}
                        confirmLabel="نعم، احذف"
                        onConfirm={() => handleDelete(c.id, c.patientName)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>

      {showAdd && (
        <AddWaitingCaseDialog
          section={section}
          onClose={() => setShowAdd(false)}
          onSuccess={() => refetch()}
        />
      )}
      {admitCase && (
        <AdmitDialog
          waitingCase={admitCase}
          onClose={() => setAdmitCase(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
