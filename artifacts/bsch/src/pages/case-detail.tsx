import { useState, useEffect, memo } from "react";
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
  { value: "high_frequency", label: "تردد عالي (HFO)" },
  { value: "vent",           label: "فنت (VENT)" },
  { value: "cpap",           label: "سباب (CPAP)" },
  { value: "standby",        label: "استاندباي" },
  { value: "hfnc",           label: "HFNC" },
  { value: "box",            label: "بوكس / نيزل كانيولا" },
  { value: "no",             label: "هواء الغرفة" },
];

const DISCHARGE_OPTIONS = [
  { value: "improved",    label: "تحسن" },
  { value: "request",     label: "بناءً على الطلب" },
  { value: "transferred", label: "تحويل لمستشفى أخرى" },
  { value: "death",       label: "وفاة" },
];

/* ─── CaseField: MUST be defined OUTSIDE the parent component ────────
   Defining components inside a parent causes React to unmount/remount
   them on every render, making inputs lose focus on each keypress. ── */
interface CaseFieldProps {
  label: string;
  isEditing: boolean;
  type?: "text" | "textarea" | "date";
  editValue: any;
  displayValue: any;
  onChange: (v: any) => void;
  dir?: "ltr" | "rtl";
}

const CaseField = memo(({ label, isEditing, type = "text", editValue, displayValue, onChange, dir }: CaseFieldProps) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {isEditing ? (
      type === "textarea" ? (
        <Textarea
          value={editValue ?? ""}
          onChange={e => onChange(e.target.value)}
          className="text-sm"
          rows={3}
          dir={dir}
        />
      ) : type === "date" ? (
        <Input
          type="date"
          value={editValue ?? ""}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      ) : (
        <Input
          value={editValue ?? ""}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-sm"
          dir={dir}
        />
      )
    ) : (
      <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm min-h-[36px] whitespace-pre-wrap">
        {displayValue || <span className="text-muted-foreground">—</span>}
      </div>
    )}
  </div>
));
CaseField.displayName = "CaseField";

/* ─────────────────────────────────────────────────────────────────── */

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const { data: patient, isLoading, refetch } = useGetCase(caseId);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const [editData, setEditData] = useState<Record<string, any>>({});

  // Only sync from server when NOT actively editing
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
    const payload: Record<string, any> = {};
    const strFields = ["patientName","age","diagnosis","symptoms","treatment","notes","parentName","parentPhone","nationalId","fileNumber","mobe"];
    strFields.forEach(f => {
      if (editData[f] !== undefined) payload[f] = editData[f] || undefined;
    });
    if (editData.status) payload.status = editData.status;
    if (editData.artificialRespiration) payload.artificialRespiration = editData.artificialRespiration;
    if (editData.caseType) payload.caseType = editData.caseType;
    if (editData.departmentId) payload.departmentId = Number(editData.departmentId);
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
      data: { status: "discharged", ...(reason ? { dischargeReason: reason } : {}) } as any
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
                    description="هل أنت متأكد من تسجيل خروج هذه الحالة؟"
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
              <CaseField label="الاسم" isEditing={isEditing} editValue={editData.patientName} displayValue={patient.patientName} onChange={v => ed("patientName", v)} />
              <CaseField label="السن" isEditing={isEditing} editValue={editData.age} displayValue={patient.age} onChange={v => ed("age", v)} />
              <CaseField label="اسم ولي الأمر" isEditing={isEditing} editValue={editData.parentName} displayValue={patient.parentName} onChange={v => ed("parentName", v)} />
              <CaseField label="رقم الهاتف" isEditing={isEditing} editValue={editData.parentPhone} displayValue={patient.parentPhone} onChange={v => ed("parentPhone", v)} dir="ltr" />
              <CaseField label="الرقم القومي" isEditing={isEditing} editValue={editData.nationalId} displayValue={patient.nationalId} onChange={v => ed("nationalId", v)} dir="ltr" />
              <CaseField label="رقم الملف" isEditing={isEditing} editValue={editData.fileNumber} displayValue={patient.fileNumber} onChange={v => ed("fileNumber", v)} dir="ltr" />
            </CardContent>
          </Card>

          <Card className="border-green-100 bg-green-50/30">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700"><Calendar className="h-4 w-4" /> التواريخ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CaseField
                label="تاريخ الدخول"
                isEditing={isEditing}
                type="date"
                editValue={toDateInput(editData.admissionDate)}
                displayValue={formatDateAr(patient.admissionDate)}
                onChange={v => ed("admissionDate", v)}
              />

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

              {isEditing && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">سبب الخروج</Label>
                  <Select value={editData.dischargeReason ?? ""} onValueChange={v => ed("dischargeReason", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="اختر السبب (اختياري)" /></SelectTrigger>
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
                <CaseField label="التشخيص" isEditing={isEditing} type="textarea" editValue={editData.diagnosis} displayValue={patient.diagnosis} onChange={v => ed("diagnosis", v)} />
              </div>
              <CaseField label="الأعراض" isEditing={isEditing} type="textarea" editValue={editData.symptoms} displayValue={patient.symptoms} onChange={v => ed("symptoms", v)} />
              <CaseField label="خطة العلاج" isEditing={isEditing} type="textarea" editValue={editData.treatment} displayValue={patient.treatment} onChange={v => ed("treatment", v)} />
              <div className="md:col-span-2">
                <CaseField label="ملاحظات" isEditing={isEditing} type="textarea" editValue={editData.notes} displayValue={patient.notes} onChange={v => ed("notes", v)} />
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

              <CaseField label="MOBE" isEditing={isEditing} editValue={editData.mobe} displayValue={patient.mobe} onChange={v => ed("mobe", v)} dir="ltr" />

              <CaseField
                label="ت. التنفس (تاريخ البدء)"
                isEditing={isEditing}
                type="date"
                editValue={toDateInput(editData.ventilationStartDate)}
                displayValue={formatDateAr(patient.ventilationStartDate)}
                onChange={v => ed("ventilationStartDate", v)}
              />
              <CaseField
                label="ت. فصل التنفس الصناعي"
                isEditing={isEditing}
                type="date"
                editValue={toDateInput(editData.ventilationEndDate)}
                displayValue={formatDateAr(patient.ventilationEndDate)}
                onChange={v => ed("ventilationEndDate", v)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
