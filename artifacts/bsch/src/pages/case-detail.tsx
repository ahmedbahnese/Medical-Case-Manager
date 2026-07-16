import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetCase, useUpdateCase, useDeleteCase } from "@workspace/api-client-react";
import {
  ArrowLeft, User, Phone, Activity, Calendar, FileText, Wind, Trash2, Edit, Save, X, AlertTriangle, Clock, Stethoscope
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

const STATUS_COLORS: Record<string, string> = {
  active:     "bg-green-100 text-green-800 border-green-300",
  recovering: "bg-blue-100 text-blue-800 border-blue-300",
  discharged: "bg-gray-100 text-gray-600 border-gray-300",
  critical:   "bg-red-100 text-red-800 border-red-300",
};

const RESP_OPTIONS = [
  { value: "no",            label: "هواء الغرفة" },
  { value: "standby",       label: "استاندباي / بوكس" },
  { value: "cpap",          label: "سباب (CPAP/HFNC)" },
  { value: "vent",          label: "فنت (VENT)" },
  { value: "high_frequency",label: "تردد عالي (HFO)" },
];

const DISCHARGE_OPTIONS = [
  { value: "improved",    label: "تحسن" },
  { value: "request",     label: "بناءً على الطلب" },
  { value: "transferred", label: "تحويل لمستشفى أخرى" },
  { value: "death",       label: "وفاة" },
];

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const { data: patient, isLoading, refetch } = useGetCase(caseId);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const [editData, setEditData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (patient && !isEditing) {
      setEditData({ ...patient });
    }
  }, [patient, isEditing]);

  if (isLoading) return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  if (!patient) return <div className="p-8 text-center text-xl text-muted-foreground">الحالة غير موجودة</div>;

  const toDateInput = (v: any) => {
    if (!v) return "";
    try { return new Date(v).toISOString().slice(0, 10); } catch { return ""; }
  };

  const handleSave = () => {
    // Build clean update payload — only send fields that the schema accepts
    const payload: Record<string, any> = {};

    // String fields
    const strFields = ["patientName","age","diagnosis","symptoms","treatment","notes","parentName","parentPhone","nationalId","fileNumber","mobe"];
    strFields.forEach(f => {
      if (editData[f] !== undefined) payload[f] = editData[f] || undefined;
    });

    // Enum fields
    if (editData.status) payload.status = editData.status;
    if (editData.artificialRespiration) payload.artificialRespiration = editData.artificialRespiration;
    if (editData.caseType) payload.caseType = editData.caseType;

    // Numeric
    if (editData.departmentId) payload.departmentId = Number(editData.departmentId);

    // Dates (extra fields handled server-side)
    payload.admissionDate = editData.admissionDate;
    payload.ventilationStartDate = editData.ventilationStartDate || null;
    payload.ventilationEndDate = editData.ventilationEndDate || null;
    if (editData.dischargeReason) payload.dischargeReason = editData.dischargeReason;

    updateCase.mutate({ id: caseId, data: payload as any }, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("تم حفظ التعديلات بنجاح");
        refetch();
      },
      onError: (e: any) => {
        const msg = e?.response?.data?.error ?? e?.message ?? "خطأ غير معروف";
        toast.error("لم يتم حفظ التعديلات: " + msg);
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
      onSuccess: () => { toast.success("تم تسجيل خروج المريض"); refetch(); },
      onError: (e: any) => toast.error("حدث خطأ: " + (e?.message ?? ""))
    });
  };

  const handleDelete = () => {
    deleteCase.mutate({ id: caseId }, {
      onSuccess: () => { toast.success("تم حذف الملف"); setLocation("/dashboard"); },
      onError: (e: any) => toast.error("حدث خطأ: " + (e?.message ?? ""))
    });
  };

  const ed = (k: string, v: any) => setEditData(p => ({ ...p, [k]: v }));

  const Field = ({ label, field, type = "text" }: { label: string; field: string; type?: "text" | "textarea" | "date" }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {isEditing ? (
        type === "textarea" ? (
          <Textarea value={editData[field] || ""} onChange={e => ed(field, e.target.value)} className="text-sm" rows={3} />
        ) : type === "date" ? (
          <Input type="date" value={toDateInput(editData[field])} onChange={e => ed(field, e.target.value)} className="h-8 text-sm" />
        ) : (
          <Input value={editData[field] || ""} onChange={e => ed(field, e.target.value)} className="h-8 text-sm" />
        )
      ) : (
        <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm min-h-[36px] whitespace-pre-wrap">
          {type === "date" ? formatDateAr(patient[field as keyof typeof patient] as any)
            : (patient[field as keyof typeof patient] as string) || <span className="text-muted-foreground">—</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{patient.patientName}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge className={`text-xs border ${STATUS_COLORS[patient.status] ?? ""}`}>
                {translate(patient.status, LABELS.STATUS)}
              </Badge>
              <span className="text-xs text-muted-foreground">مدة الإقامة: {calcStayLabel(patient.admissionDate)}</span>
              {patient.departmentName && (
                <span className="text-xs text-muted-foreground">| {patient.departmentName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isEditing ? (
            <>
              {patient.status !== "discharged" && (
                <>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" /> تعديل
                  </Button>
                  <ConfirmDialog
                    trigger={<Button variant="outline" size="sm" className="gap-1 border-orange-300 text-orange-600 hover:bg-orange-50">تسجيل خروج</Button>}
                    title="تسجيل خروج"
                    description="اختر سبب الخروج"
                    confirmLabel="تأكيد الخروج"
                    onConfirm={() => handleDischarge()}
                  />
                </>
              )}
              <ConfirmDialog
                trigger={<Button variant="ghost" size="sm" className="gap-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> حذف</Button>}
                title="حذف ملف المريض"
                description={`هل أنت متأكد من حذف ملف "${patient.patientName}"؟ لا يمكن التراجع.`}
                confirmLabel="نعم، احذف"
                onConfirm={handleDelete}
              />
            </>
          ) : (
            <>
              <Button size="sm" className="gap-1" onClick={handleSave} disabled={updateCase.isPending}>
                <Save className="h-4 w-4" /> {updateCase.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setIsEditing(false); setEditData({ ...patient }); }}>
                <X className="h-4 w-4" /> إلغاء
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Demographics */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700"><User className="h-4 w-4" /> بيانات المريض</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="الاسم" field="patientName" />
              <Field label="السن" field="age" />
              <Field label="اسم ولي الأمر" field="parentName" />
              <Field label="رقم الهاتف" field="parentPhone" />
              <Field label="الرقم القومي" field="nationalId" />
              <Field label="رقم الملف" field="fileNumber" />
            </CardContent>
          </Card>

          <Card className="border-green-100 bg-green-50/30">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700"><Calendar className="h-4 w-4" /> التواريخ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="تاريخ الدخول" field="admissionDate" type="date" />

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الحالة</Label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={v => ed("status", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABELS.STATUS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`text-xs border ${STATUS_COLORS[patient.status] ?? ""}`}>{translate(patient.status, LABELS.STATUS)}</Badge>
                )}
              </div>

              {patient.dischargeDate && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">تاريخ الخروج</Label>
                  <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm">{formatDateAr(patient.dischargeDate)}</div>
                </div>
              )}

              {isEditing && patient.status === "discharged" && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">سبب الخروج</Label>
                  <Select value={editData.dischargeReason ?? ""} onValueChange={v => ed("dischargeReason", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="اختر السبب" /></SelectTrigger>
                    <SelectContent>
                      {DISCHARGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Medical Details */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-orange-100 bg-orange-50/30">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-700"><Stethoscope className="h-4 w-4" /> المعلومات الطبية</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Field label="التشخيص" field="diagnosis" type="textarea" />
              </div>
              <Field label="الأعراض" field="symptoms" type="textarea" />
              <Field label="خطة العلاج" field="treatment" type="textarea" />
              <div className="md:col-span-2">
                <Field label="ملاحظات" field="notes" type="textarea" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-100 bg-teal-50/30">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-teal-700"><Wind className="h-4 w-4" /> التنفس الصناعي</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">وضع التنفس (Mode)</Label>
                {isEditing ? (
                  <Select value={editData.artificialRespiration ?? "no"} onValueChange={v => ed("artificialRespiration", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm">
                    {translate(patient.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">MOBE</Label>
                {isEditing ? (
                  <Input value={editData.mobe || ""} onChange={e => ed("mobe", e.target.value)} className="h-8 text-sm" />
                ) : (
                  <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm min-h-[36px]">
                    {patient.mobe || <span className="text-muted-foreground">—</span>}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ت. التنفس (تاريخ البدء)</Label>
                {isEditing ? (
                  <Input type="date" value={toDateInput(editData.ventilationStartDate)} onChange={e => ed("ventilationStartDate", e.target.value)} className="h-8 text-sm" />
                ) : (
                  <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm min-h-[36px]">
                    {formatDateAr(patient.ventilationStartDate) || <span className="text-muted-foreground">—</span>}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ت. فصل التنفس الصناعي</Label>
                {isEditing ? (
                  <Input type="date" value={toDateInput(editData.ventilationEndDate)} onChange={e => ed("ventilationEndDate", e.target.value)} className="h-8 text-sm" />
                ) : (
                  <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm min-h-[36px]">
                    {formatDateAr(patient.ventilationEndDate) || <span className="text-muted-foreground">—</span>}
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
