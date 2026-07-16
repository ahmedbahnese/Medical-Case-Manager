import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetCase, useUpdateCase, useDeleteCase, CaseUpdateStatus, CaseUpdateArtificialRespiration } from "@workspace/api-client-react";
import {
  ArrowLeft, User, Phone, Activity, Calendar, FileText, Wind, Trash2, Edit, Save, X, AlertTriangle, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LABELS, translate, formatDateAr, calcStayLabel } from "@/lib/constants";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const { data: patient, isLoading, refetch } = useGetCase(caseId);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (patient && !isEditing) setEditData({ ...patient });
  }, [patient, isEditing]);

  if (isLoading) return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  if (!patient) return <div className="p-8 text-center text-xl">الحالة غير موجودة</div>;

  const handleSave = () => {
    const updatePayload: any = {
      patientName: editData.patientName,
      age: editData.age,
      diagnosis: editData.diagnosis,
      symptoms: editData.symptoms,
      treatment: editData.treatment,
      notes: editData.notes,
      parentName: editData.parentName,
      parentPhone: editData.parentPhone,
      nationalId: editData.nationalId,
      fileNumber: editData.fileNumber,
      status: editData.status as CaseUpdateStatus,
      artificialRespiration: editData.artificialRespiration as CaseUpdateArtificialRespiration,
      mobe: editData.mobe,
      ventilationStartDate: editData.ventilationStartDate || null,
      ventilationEndDate: editData.ventilationEndDate || null,
      admissionDate: editData.admissionDate,
      departmentId: editData.departmentId,
    };

    updateCase.mutate({ id: caseId, data: updatePayload as any }, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("تم حفظ التعديلات بنجاح");
        refetch();
      },
      onError: (e: any) => {
        toast.error("لم يتم حفظ التعديلات: " + (e.message ?? "خطأ غير معروف"));
      }
    });
  };

  const handleDischarge = (reason?: string) => {
    updateCase.mutate({
      id: caseId,
      data: {
        status: "discharged",
        ...(reason ? { dischargeReason: reason } : {}),
      } as any
    }, {
      onSuccess: () => {
        toast.success("تم تسجيل خروج المريض");
        refetch();
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  const handleDelete = () => {
    deleteCase.mutate({ id: caseId }, {
      onSuccess: () => {
        toast.success("تم حذف الملف");
        setLocation("/dashboard");
      },
      onError: (e: any) => toast.error("حدث خطأ: " + e.message)
    });
  };

  const ed = (k: string, v: any) => setEditData((prev: any) => ({ ...prev, [k]: v }));

  const viewOrEdit = (label: string, field: string, type: "text" | "textarea" | "date" = "text") => (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {isEditing ? (
        type === "textarea" ? (
          <Textarea value={editData[field] || ""} onChange={e => ed(field, e.target.value)} className="h-20 text-sm" />
        ) : type === "date" ? (
          <Input type="datetime-local" value={editData[field] ? new Date(editData[field]).toISOString().slice(0, 16) : ""}
            onChange={e => ed(field, e.target.value)} className="text-sm" />
        ) : (
          <Input value={editData[field] || ""} onChange={e => ed(field, e.target.value)} className="text-sm" />
        )
      ) : (
        <p className="text-sm font-medium">{
          type === "date"
            ? formatDateAr(patient[field as keyof typeof patient] as any)
            : (patient[field as keyof typeof patient] as string) || "—"
        }</p>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {patient.patientName}
              <Badge variant={patient.status === "critical" ? "destructive" : patient.status === "discharged" ? "outline" : "default"}>
                {translate(patient.status, LABELS.STATUS)}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {patient.fileNumber || "بدون رقم ملف"} • القسم: {patient.departmentName}
              • مدة الإقامة: {calcStayLabel(patient.admissionDate)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 ml-1" /> إلغاء
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateCase.isPending}>
                <Save className="h-4 w-4 ml-1" /> {updateCase.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </>
          ) : (
            <>
              {patient.status !== "discharged" && (
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="sm">
                      <Clock className="h-4 w-4 ml-1" /> تسجيل خروج
                    </Button>
                  }
                  title="تأكيد تسجيل الخروج"
                  description={`هل أنت متأكد من تسجيل خروج المريض "${patient.patientName}"؟`}
                  confirmLabel="نعم، سجل الخروج"
                  variant="default"
                  onConfirm={() => handleDischarge("improved")}
                />
              )}
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 ml-1" /> تعديل
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 ml-1" /> حذف
                  </Button>
                }
                title="تأكيد الحذف النهائي"
                description={`هل أنت متأكد من حذف ملف "${patient.patientName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                confirmLabel="نعم، احذف نهائياً"
                onConfirm={handleDelete}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <Card className="md:col-span-1 h-fit shadow-sm bg-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base border-b pb-2">بيانات شخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {viewOrEdit("العمر", "age")}
            {viewOrEdit("ولي الأمر", "parentName")}
            {viewOrEdit("رقم الهاتف", "parentPhone")}
            {viewOrEdit("الرقم القومي", "nationalId")}
            {viewOrEdit("رقم الملف", "fileNumber")}
            {viewOrEdit("MOBE", "mobe")}

            <div className="pt-3 mt-2 border-t space-y-2">
              {viewOrEdit("تاريخ الدخول", "admissionDate", "date")}
              {viewOrEdit("تاريخ التوصيل على التنفس", "ventilationStartDate", "date")}
              {viewOrEdit("تاريخ الفصل عن التنفس", "ventilationEndDate", "date")}
              {patient.dischargeDate && viewOrEdit("تاريخ الخروج", "dischargeDate", "date")}
            </div>
          </CardContent>
        </Card>

        {/* Main */}
        <div className="md:col-span-2 space-y-4">
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="text-base">الحالة الطبية</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">حالة المريض</Label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={v => ed("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABELS.STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 bg-muted/30 rounded-md font-medium text-sm">
                    {translate(patient.status, LABELS.STATUS)}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">التنفس الصناعي</Label>
                {isEditing ? (
                  <Select value={editData.artificialRespiration} onValueChange={v => ed("artificialRespiration", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`p-2 rounded-md font-medium text-sm flex items-center gap-2 ${patient.artificialRespiration !== "no" ? "bg-teal-500/10 text-teal-600" : "bg-muted/30"}`}>
                    {patient.artificialRespiration !== "no" && <Wind className="h-4 w-4" />}
                    {translate(patient.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Activity className="h-4 w-4" /> التشخيص
                </Label>
                {isEditing ? (
                  <Textarea value={editData.diagnosis || ""} onChange={e => ed("diagnosis", e.target.value)} className="h-20" />
                ) : (
                  <div className="bg-muted/10 p-3 rounded-md min-h-[60px] border whitespace-pre-wrap text-sm">
                    {patient.diagnosis || "لم يكتب"}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <AlertTriangle className="h-4 w-4" /> الأعراض
                </Label>
                {isEditing ? (
                  <Textarea value={editData.symptoms || ""} onChange={e => ed("symptoms", e.target.value)} />
                ) : (
                  <div className="bg-muted/10 p-3 rounded-md min-h-[50px] border whitespace-pre-wrap text-sm">
                    {patient.symptoms || "لم يكتب"}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" /> خطة العلاج
                </Label>
                {isEditing ? (
                  <Textarea value={editData.treatment || ""} onChange={e => ed("treatment", e.target.value)} className="h-24" />
                ) : (
                  <div className="bg-muted/10 p-3 rounded-md min-h-[60px] border whitespace-pre-wrap text-sm">
                    {patient.treatment || "لم يكتب"}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold text-primary">ملاحظات</Label>
                {isEditing ? (
                  <Textarea value={editData.notes || ""} onChange={e => ed("notes", e.target.value)} />
                ) : (
                  <div className="bg-muted/10 p-3 rounded-md border whitespace-pre-wrap text-sm">
                    {patient.notes || "لا توجد ملاحظات"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
