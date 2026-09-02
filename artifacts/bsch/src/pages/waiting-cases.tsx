import { useState } from "react";
import {
  useGetWaitingCases, useUpdateWaitingCase, useDeleteWaitingCase,
  useCreateWaitingCase, useGetDepartments, useCreateCase,
  WaitingCaseUpdateStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users, Clock, CheckCircle2, XCircle, Trash2, Plus, Printer,
  ChevronDown, ChevronUp, FileText, Edit2, FileSpreadsheet, FileDown,
  LogOut, BookOpen
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LABELS, translate, deptTypeToCaseType, formatDateAr } from "@/lib/constants";
import { exportWordDoc } from "@/lib/word-export";
import { exportPDF } from "@/lib/pdf-export";
import { exportArabicXlsx } from "@/lib/excel-export";
import { useAppSettings } from "@/contexts/settings-context";
import { ReportWatermark } from "@/components/report-watermark";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Section = "reception" | "servo";

const EXIT_REASONS = [
  { value: "improved", label: "تحسن / دخل القسم" },
  { value: "request", label: "خروج حسب الطلب" },
  { value: "transferred", label: "تحويل لمستشفى أخرى" },
  { value: "death", label: "وفاة" },
];

// Reception care type filter options
const RECEPTION_FILTERS = [
  { value: "all",                   label: "الكل"                 },
  { value: "intensive_care_high",   label: "العناية الكبرى"       },
  { value: "intensive_care_medium", label: "العناية المتوسطة"     },
  { value: "picu",                  label: "البيكيو (PICU)"       },
  { value: "incubator",             label: "حضانة"                },
  { value: "internal",              label: "الداخلي"              },
];

const EMPTY_FORM = {
  patientName: "", age: "", diagnosis: "", parentPhone: "", nationalId: "",
  careType: "intensive_care_high", artificialRespiration: "no",
  centralRoomRequired: false, centralRoomCode: "",
};

/* ─────────────────────────── Export helpers ─────────────────────────── */
function buildWaitingHtml(cases: any[], title: string, hospitalName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const rows = cases.map((c, i) => `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td><strong>${c.patientName}</strong></td>
      <td>${c.age ?? "—"}</td>
      <td>${c.diagnosis ?? "—"}</td>
      <td>${translate(c.careType, LABELS.CARE_TYPES)}</td>
      <td>${translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
      <td>${c.centralRoomRequired ? (c.centralRoomCode ? `غرفة: ${c.centralRoomCode}` : "✓ مطلوب") : "—"}</td>
      <td>${c.parentPhone ?? "—"}</td>
    </tr>`).join("");
  return `
    <div class="header">
      <h2>${hospitalName}</h2>
      <h3>قائمة الانتظار — ${title}</h3>
      <p>${dateStr} — عدد الحالات: ${cases.length}</p>
    </div>
    <table border="1">
      <tr style="background:#d9e1f2">
        <th>م</th><th>الاسم</th><th>السن</th><th>التشخيص</th>
        <th>نوع الرعاية</th><th>التنفس</th><th>غرفة مركزية</th><th>الهاتف</th>
      </tr>
      ${rows}
    </table>`;
}

function exportWaitingExcel(cases: any[], title: string, hospitalName: string): void {
  exportArabicXlsx({
    filename: `قائمة-الانتظار-${title}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    hospitalName,
    reportTitle: `قائمة الانتظار — ${title}`,
    columns: ["م", "الاسم", "السن", "التشخيص", "نوع الرعاية", "التنفس", "غرفة مركزية", "الهاتف"],
    rows: cases.map((c, i) => [
      i + 1, c.patientName, c.age ?? "", c.diagnosis ?? "",
      translate(c.careType, LABELS.CARE_TYPES),
      translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION),
      c.centralRoomRequired ? (c.centralRoomCode ? `غرفة: ${c.centralRoomCode}` : "مطلوب") : "",
      c.parentPhone ?? "",
    ]),
    columnWidths: [7, 28, 14, 32, 22, 18, 20, 18],
  });
}

/* ─────────────────────────── Add Form ─────────────────────────── */
function AddForm({ section, onSuccess }: { section: Section; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const create = useCreateWaitingCase();
  const [reportFile, setReportFile] = useState<{ name: string; data: string } | null>(null);
  const f = (k: keyof typeof EMPTY_FORM, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.patientName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    create.mutate({ data: {
      ...form,
      section,
      medicalReportName: reportFile?.name ?? null,
      medicalReportData: reportFile?.data ?? null,
    } as any }, {
      onSuccess: () => {
        toast.success("تمت الإضافة لقائمة الانتظار");
        setForm({ ...EMPTY_FORM });
        setReportFile(null);
        setOpen(false);
        onSuccess();
      },
      onError: (e: any) => {
        const msg = e?.response?.data?.error ?? e?.message ?? "خطأ غير معروف";
        toast.error("خطأ في الإضافة: " + msg);
      }
    });
  };

  return (
    <Card className="border-dashed border-primary/40">
      <button
        className="w-full p-3 flex items-center justify-between text-sm font-medium text-primary hover:bg-primary/5 transition-colors rounded-t-lg"
        onClick={() => setOpen(o => !o)}>
        <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> إضافة حالة للانتظار — {section === "servo" ? "سيرفو" : "قسم الاستقبال"}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">اسم المريض *</Label>
              <Input value={form.patientName} onChange={e => f("patientName", e.target.value)} placeholder="الاسم رباعي" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">السن</Label>
              <Input value={form.age} onChange={e => f("age", e.target.value)} placeholder="مثال: 3 أيام" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">رقم الهاتف</Label>
              <Input dir="ltr" value={form.parentPhone} onChange={e => f("parentPhone", e.target.value)} placeholder="01X..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الرقم القومي للمريض / ولي الأمر</Label>
              <Input dir="ltr" value={form.nationalId} onChange={e => f("nationalId", e.target.value)} placeholder="14 رقماً" maxLength={14} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع الرعاية المطلوب</Label>
              <Select value={form.careType} onValueChange={v => f("careType", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS.CARE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">التنفس الصناعي</Label>
              <Select value={form.artificialRespiration} onValueChange={v => f("artificialRespiration", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 md:col-span-3 space-y-1">
              <Label className="text-xs">التشخيص</Label>
              <Textarea value={form.diagnosis} onChange={e => f("diagnosis", e.target.value)} rows={2} className="resize-none" />
            </div>
            <div className="col-span-2 md:col-span-3 space-y-1">
              <Label className="text-xs">تصوير / اختيار ورقة الطوارئ (اختياري، حتى 10MB)</Label>
              <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" capture="environment" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) { toast.error("حجم ورقة الطوارئ أكبر من 10MB"); return; }
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                setReportFile({ name: file.name, data });
              }} />
              {reportFile && <p className="text-xs text-muted-foreground">{reportFile.name}</p>}
            </div>
            <div className="col-span-2 md:col-span-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox id={`cr-${section}`} checked={form.centralRoomRequired} onCheckedChange={v => f("centralRoomRequired", !!v)} />
                <Label htmlFor={`cr-${section}`} className="text-xs cursor-pointer">يحتاج غرفة مركزية</Label>
              </div>
              {form.centralRoomRequired && (
                <Input value={form.centralRoomCode} onChange={e => f("centralRoomCode", e.target.value)}
                  placeholder="كود الغرفة" className="h-8 w-40" />
              )}
              <Button onClick={handleSubmit} disabled={create.isPending} size="sm" className="mr-auto">
                {create.isPending ? "جاري الإضافة..." : "إضافة للانتظار"}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ─────────────────────── Unified Action Dialog ─────────────────────── */
/**
 * Single floating dialog for both editing a waiting case and taking action on it.
 * Shows name/age/diagnosis/care-type editable, then action choices: admit or exit.
 */
function WaitingCaseActionDialog({
  waitingCase, onClose, onSuccess
}: { waitingCase: any; onClose: () => void; onSuccess: () => void }) {
  const { data: departments } = useGetDepartments();
  const update = useUpdateWaitingCase();
  const createCase = useCreateCase();

  // Editable fields
  const [form, setForm] = useState({
    patientName: waitingCase.patientName ?? "",
    age: waitingCase.age ?? "",
    diagnosis: waitingCase.diagnosis ?? "",
    parentPhone: waitingCase.parentPhone ?? "",
    nationalId: waitingCase.nationalId ?? "",
    careType: waitingCase.careType ?? "intensive_care_high",
    artificialRespiration: waitingCase.artificialRespiration ?? "no",
    centralRoomRequired: waitingCase.centralRoomRequired ?? false,
    centralRoomCode: waitingCase.centralRoomCode ?? "",
  });
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Action section
  const [action, setAction] = useState<"none" | "admit" | "exit">("none");
  const [deptId, setDeptId] = useState("");
  const [exitReason, setExitReason] = useState("improved");
  const [medicalReport, setMedicalReport] = useState("");
  const [reportFile, setReportFile] = useState<{ name: string; data: string } | null>(
    waitingCase.medicalReportData ? { name: waitingCase.medicalReportName ?? "تقرير محفوظ", data: waitingCase.medicalReportData } : null
  );

  const isPending = update.isPending || createCase.isPending;

  const handleSaveOnly = () => {
    update.mutate({ id: waitingCase.id, data: { ...form, medicalReport, medicalReportName: reportFile?.name, medicalReportData: reportFile?.data } as any }, {
      onSuccess: () => { toast.success("تم تحديث البيانات"); onSuccess(); onClose(); },
      onError: (e: any) => toast.error("خطأ: " + (e?.response?.data?.error ?? e.message)),
    });
  };

  const handleConfirmAction = () => {
    if (action === "admit") {
      if (!deptId) { toast.error("الرجاء اختيار القسم"); return; }
      const dept = (departments as any[] ?? []).find((d: any) => d.id.toString() === deptId);
      createCase.mutate({
        data: {
          departmentId: parseInt(deptId),
          patientName: form.patientName,
          age: form.age || undefined,
          diagnosis: form.diagnosis || undefined,
          artificialRespiration: (form.artificialRespiration ?? "no") as any,
          caseType: dept ? deptTypeToCaseType(dept.departmentType as string) as any : "intensive_care_high",
          admissionDate: new Date().toISOString(),
          ...(medicalReport ? { notes: medicalReport } : {}),
        }
      }, {
        onSuccess: () => {
          update.mutate({ id: waitingCase.id, data: { status: "admitted" as WaitingCaseUpdateStatus, ...form, medicalReport, medicalReportName: reportFile?.name, medicalReportData: reportFile?.data } as any }, {
            onSuccess: () => { toast.success("تم نقل الحالة للقسم بنجاح"); onSuccess(); onClose(); },
          });
        },
        onError: (e: any) => toast.error("خطأ في الإضافة: " + (e?.response?.data?.error ?? e.message))
      });
    } else if (action === "exit") {
      update.mutate({
        id: waitingCase.id,
        data: { status: "cancelled" as WaitingCaseUpdateStatus, exitReason, ...form, medicalReport, medicalReportName: reportFile?.name, medicalReportData: reportFile?.data } as any
      }, {
        onSuccess: () => { toast.success(`تم تسجيل الخروج — ${EXIT_REASONS.find(r => r.value === exitReason)?.label}`); onSuccess(); onClose(); },
        onError: (e: any) => toast.error("خطأ: " + e.message)
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] h-[calc(100dvh-1rem)] max-h-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit2 className="h-4 w-4" />
            <span className="font-bold">{waitingCase.patientName}</span>
            <Badge variant="outline" className="text-xs mr-1">
              {translate(waitingCase.careType, LABELS.CARE_TYPES)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Editable patient info ── */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">بيانات الحالة</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">اسم المريض *</Label>
                <Input value={form.patientName} onChange={e => f("patientName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">السن</Label>
                <Input value={form.age} onChange={e => f("age", e.target.value)} placeholder="3 أيام" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الهاتف</Label>
                <Input dir="ltr" value={form.parentPhone} onChange={e => f("parentPhone", e.target.value)} placeholder="01X..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">القسم المطلوب (نوع الرعاية)</Label>
                <Select value={form.careType} onValueChange={v => f("careType", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABELS.CARE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">التنفس الصناعي</Label>
                <Select value={form.artificialRespiration} onValueChange={v => f("artificialRespiration", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">التشخيص</Label>
                <Textarea value={form.diagnosis} onChange={e => f("diagnosis", e.target.value)} rows={2} className="resize-none" />
              </div>
              <div className="col-span-2 flex items-center gap-3 flex-wrap">
                <Checkbox id="cr-action" checked={form.centralRoomRequired} onCheckedChange={v => f("centralRoomRequired", !!v)} />
                <Label htmlFor="cr-action" className="text-xs cursor-pointer">يحتاج غرفة مركزية</Label>
                {form.centralRoomRequired && (
                  <Input value={form.centralRoomCode} onChange={e => f("centralRoomCode", e.target.value)}
                    placeholder="كود الغرفة" className="h-8 w-32" />
                )}
              </div>
            </div>
          </div>

          {/* ── Action section ── */}
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">الإجراء</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={action === "admit" ? "default" : "outline"}
                onClick={() => setAction(action === "admit" ? "none" : "admit")}
                className="w-full gap-1"
              >
                <CheckCircle2 className="h-4 w-4" /> حجز / دخول قسم
              </Button>
              <Button
                variant={action === "exit" ? "secondary" : "outline"}
                onClick={() => setAction(action === "exit" ? "none" : "exit")}
                className="w-full gap-1"
              >
                <LogOut className="h-4 w-4" /> خروج / إلغاء
              </Button>
            </div>

            {action === "admit" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label>اختر القسم للحجز</Label>
                  {(() => {
                    const allDepts = (departments as any[] ?? []);
                    const ct = form.careType;
                    const isCompat = (d: any) => {
                      if (!ct) return true;
                      if (ct === "incubator") return d.departmentType?.startsWith("incubator") || d.departmentType === "picu";
                      return d.departmentType === ct;
                    };
                    const compat = allDepts.filter(isCompat);
                    const others = allDepts.filter(d => !isCompat(d));
                    return (
                      <Select value={deptId} onValueChange={setDeptId}>
                        <SelectTrigger><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
                        <SelectContent>
                          {compat.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">أقسام متوافقة مع نوع الرعاية</div>
                              {compat.map((d: any) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.name} — شاغر: {d.capacity - d.activeCasesCount}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {others.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-1">أقسام أخرى</div>
                              {others.map((d: any) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.name} — شاغر: {d.capacity - d.activeCasesCount}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground">ستُنشأ حالة نشطة تلقائياً في القسم المختار</p>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs"><BookOpen className="h-3 w-3" /> تقرير طبي (اختياري)</Label>
                  <Textarea
                    value={medicalReport}
                    onChange={e => setMedicalReport(e.target.value)}
                    placeholder="أضف ملاحظات أو تقرير طبي للحالة..."
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            )}

            {action === "exit" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label>سبب الخروج / الإلغاء</Label>
                  <Select value={exitReason} onValueChange={setExitReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXIT_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs"><BookOpen className="h-3 w-3" /> تقرير طبي (اختياري)</Label>
                  <Textarea
                    value={medicalReport}
                    onChange={e => setMedicalReport(e.target.value)}
                    placeholder="أضف ملاحظات أو تقرير طبي..."
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1 pt-1">
              <Label className="text-xs">تصوير / اختيار ورقة الطوارئ (اختياري، حتى 10MB)</Label>
              <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" capture="environment" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) { toast.error("حجم ورقة الطوارئ أكبر من 10MB"); return; }
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                setReportFile({ name: file.name, data });
              }} />
              {reportFile && <p className="text-xs text-muted-foreground">{reportFile.name}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="secondary" onClick={handleSaveOnly} disabled={isPending}>
            حفظ التعديلات فقط
          </Button>
          {action !== "none" && (
            <Button onClick={handleConfirmAction} disabled={isPending}>
              {isPending ? "جاري التنفيذ..." : action === "admit" ? "تأكيد الحجز" : "تأكيد الخروج"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Cases Table ─────────────────────────── */
function CasesTable({ cases, printCases, onAction, onDelete, isLoading, selectedIds, onToggle, onToggleAll }: {
  cases: any[]; printCases: any[];
  onAction: (c: any) => void; onDelete: (c: any) => void;
  isLoading: boolean; selectedIds: Set<number>; onToggle: (id: number) => void; onToggleAll: (all: boolean) => void;
}) {
  if (isLoading) return (
    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
  );

  if (!cases.length) return (
    <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-xl">
      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p>لا توجد حالات في الانتظار</p>
    </div>
  );

  const allChecked = cases.length > 0 && cases.every(c => selectedIds.has(c.id));
  const printSet = new Set(printCases.map(c => c.id));

  return (
    <div className="rounded-lg border overflow-x-auto print-area">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-8 no-print">
              <Checkbox checked={allChecked} onCheckedChange={v => onToggleAll(!!v)} />
            </TableHead>
            <TableHead className="w-10 text-center">م</TableHead>
            <TableHead>اسم المريض</TableHead>
            <TableHead>السن</TableHead>
            <TableHead className="hidden lg:table-cell">الرقم القومي</TableHead>
            <TableHead className="hidden md:table-cell">التشخيص</TableHead>
            <TableHead className="hidden sm:table-cell">نوع الرعاية</TableHead>
            <TableHead className="hidden lg:table-cell">التنفس</TableHead>
            <TableHead className="hidden md:table-cell">وقت الانتظار</TableHead>
            <TableHead className="text-center no-print">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c, i) => {
            const mins = Math.floor((Date.now() - new Date(c.createdAt ?? c.requestDate ?? Date.now()).getTime()) / 60000);
            const waitLabel = mins < 60 ? `${mins} د` : `${Math.floor(mins/60)} س ${mins%60} د`;
            const hiddenInPrint = !printSet.has(c.id);
            return (
              <TableRow
                key={c.id}
                className={[
                  c.centralRoomRequired ? "bg-amber-50/60 dark:bg-amber-950/20" : "",
                  hiddenInPrint ? "print:hidden" : "",
                ].join(" ")}
              >
                <TableCell className="no-print">
                  <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => onToggle(c.id)} />
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-sm">{i + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{c.patientName}</div>
                  {c.centralRoomRequired && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1 mt-0.5">
                      {c.centralRoomCode ? `غرفة: ${c.centralRoomCode}` : "غرفة مركزية"}
                    </Badge>
                  )}
                  {c.parentPhone && <div className="text-xs text-muted-foreground">{c.parentPhone}</div>}
                </TableCell>
                <TableCell className="text-sm">{c.age ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs font-mono" dir="ltr">{c.nationalId ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm max-w-[150px] truncate">{c.diagnosis ?? "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-xs">{translate(c.careType, LABELS.CARE_TYPES)}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline ml-0.5" />{waitLabel}
                </TableCell>
                <TableCell className="no-print">
                  <div className="flex gap-1 justify-center">
                    {c.medicalReportData && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        title="عرض التقرير المرفق"
                        onClick={e => {
                          e.stopPropagation();
                          const win = window.open("", "_blank");
                          if (!win) return;
                          if (c.medicalReportData.startsWith("data:image")) {
                            win.document.write(`<html><body style="margin:0;background:#111"><img src="${c.medicalReportData}" style="max-width:100%;display:block;margin:auto" /></body></html>`);
                          } else {
                            win.document.write(`<html><body style="margin:0"><iframe src="${c.medicalReportData}" style="width:100vw;height:100vh;border:none"></iframe></body></html>`);
                          }
                          win.document.title = c.medicalReportName || "تقرير الحالة";
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-xs gap-0.5 px-2"
                      onClick={() => onAction(c)}>
                      <Edit2 className="h-3 w-3" /> تعديل / إجراء
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                      title="حذف من قائمة الانتظار"
                      description={`هل أنت متأكد من حذف "${c.patientName}"؟`}
                      confirmLabel="حذف"
                      onConfirm={() => onDelete(c)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────────── */
export default function WaitingCases() {
  const [section, setSection] = useState<Section>("reception");
  const [activeCase, setActiveCase] = useState<any>(null); // unified dialog
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [receptionFilter, setReceptionFilter] = useState("all");
  const queryClient = useQueryClient();
  const { hospital_name, logo_base64, watermark_enabled } = useAppSettings();

  const { data: casesRaw, isLoading, refetch } = useGetWaitingCases({ section, status: "waiting" } as any);
  const { data: servoAll } = useGetWaitingCases({ section: "servo", status: "waiting" } as any);
  const { data: recepAll } = useGetWaitingCases({ section: "reception", status: "waiting" } as any);
  const deleteCase = useDeleteWaitingCase();

  const invalidateAll = () => {
    queryClient.invalidateQueries();
    refetch();
  };

  const handleDelete = (c: any) => {
    deleteCase.mutate({ id: c.id }, {
      onSuccess: () => {
        toast.success(`تم حذف ${c.patientName}`);
        setSelectedIds(prev => { const n=new Set(prev); n.delete(c.id); return n; });
        invalidateAll();
      },
      onError: (e: any) => toast.error("خطأ: " + e.message)
    });
  };

  const casesArr = (casesRaw ?? []) as any[];

  // Apply reception care-type filter
  const filteredCases = section === "reception" && receptionFilter !== "all"
    ? casesArr.filter(c => {
        if (receptionFilter === "incubator") {
          return c.careType === "incubator" || c.careType?.startsWith("incubator_");
        }
        return c.careType === receptionFilter;
      })
    : casesArr;

  const toggleId = (id: number) => setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = (all: boolean) => setSelectedIds(all ? new Set(filteredCases.map(c => c.id)) : new Set());

  // Cases to use for print/export: selected subset if any, else filtered
  const selectedCases = filteredCases.filter(c => selectedIds.has(c.id));
  const exportCases = selectedCases.length > 0 ? selectedCases : filteredCases;
  const sectionTitle = section === "servo" ? "سيرفو" : "قسم الاستقبال";
  const filterLabel = receptionFilter !== "all"
    ? (RECEPTION_FILTERS.find(f => f.value === receptionFilter)?.label ?? "")
    : "";
  const exportTitle = filterLabel ? `${sectionTitle} — ${filterLabel}` : sectionTitle;

  const handlePrint = () => window.print();

  const handleExportWord = () => {
    const html = buildWaitingHtml(exportCases, exportTitle, hospital_name);
    exportWordDoc(html, `waiting-${section}-${new Date().toISOString().slice(0,10)}.doc`);
  };

  const handleExportPDF = () => {
    const html = buildWaitingHtml(exportCases, exportTitle, hospital_name);
    exportPDF(html, `waiting-${section}-${new Date().toISOString().slice(0,10)}.pdf`, logo_base64, watermark_enabled ? logo_base64 : null);
  };

  const handleExportExcel = () => {
    exportWaitingExcel(exportCases, exportTitle, hospital_name);
  };

  const servoCount = (servoAll ?? []).length;
  const recepCount = (recepAll ?? []).length;

  return (
    <ReportWatermark enabled={watermark_enabled} logo={logo_base64} className="space-y-4">
      <div className="flex items-center justify-between no-print flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">قوائم الانتظار</h1>
          <p className="text-muted-foreground text-sm">إدارة حالات الانتظار — قسم الاستقبال وسيرفو</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {selectedCases.length > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-1">{selectedCases.length} محدد</Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> {selectedCases.length > 0 ? `Excel (${selectedCases.length})` : "Excel"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportWord}>
            <FileText className="h-4 w-4" /> {selectedCases.length > 0 ? `Word (${selectedCases.length})` : "Word"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" /> {selectedCases.length > 0 ? `PDF (${selectedCases.length})` : "PDF"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> {selectedCases.length > 0 ? `طباعة (${selectedCases.length})` : "طباعة"}
          </Button>
        </div>
      </div>

      <Tabs value={section} onValueChange={v => { setSection(v as Section); setSelectedIds(new Set()); setReceptionFilter("all"); }}>
        <TabsList className="w-full no-print">
          <TabsTrigger value="reception" className="flex-1 gap-2">
            قسم الاستقبال
            {recepCount > 0 && <Badge variant="secondary" className="text-xs h-4 px-1">{recepCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="servo" className="flex-1 gap-2">
            سيرفو
            {servoCount > 0 && <Badge variant="secondary" className="text-xs h-4 px-1">{servoCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {(["reception", "servo"] as Section[]).map(sec => (
          <TabsContent key={sec} value={sec} className="space-y-4 mt-4">
            {/* Inline Add Form */}
            <div className="no-print">
              <AddForm section={sec} onSuccess={invalidateAll} />
            </div>

            {/* Reception care-type sub-filter */}
            {sec === "reception" && (
              <div className="no-print flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground ml-1">تصفية:</span>
                {RECEPTION_FILTERS.map(rf => (
                  <button
                    key={rf.value}
                    onClick={() => { setReceptionFilter(rf.value); setSelectedIds(new Set()); }}
                    className={[
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      receptionFilter === rf.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    ].join(" ")}
                  >
                    {rf.label}
                    {rf.value !== "all" && (
                      <span className="mr-1 opacity-60">
                        ({(casesArr.filter(c =>
                          rf.value === "incubator"
                            ? c.careType === "incubator" || c.careType?.startsWith("incubator_")
                            : c.careType === rf.value
                        )).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Header for print */}
            <div className="hidden print:block text-center border-b-2 border-black pb-2 mb-3">
              {logo_base64 && <img src={logo_base64} alt="logo" className="h-12 object-contain mx-auto mb-1" />}
              <h2 className="font-bold text-lg">{hospital_name}</h2>
              <h3 className="font-bold">بيان قائمة انتظار — {sec === "servo" ? "سيرفو" : "قسم الاستقبال"}{filterLabel ? ` — ${filterLabel}` : ""}</h3>
              <p className="text-sm">{new Date().toLocaleDateString("ar-EG", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" })}</p>
              {selectedCases.length > 0 && <p className="text-xs">المحددون فقط: {selectedCases.length} حالة</p>}
            </div>

            {/* Cases table */}
            <CasesTable
              cases={filteredCases}
              printCases={exportCases}
              isLoading={isLoading}
              onAction={setActiveCase}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onToggleAll={toggleAll}
            />

            {filteredCases.length > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground no-print">
                <span>إجمالي: <strong>{filteredCases.length}</strong> حالة</span>
                {selectedCases.length > 0 && (
                  <span className="text-primary font-medium">محدد للطباعة/التصدير: {selectedCases.length}</span>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Unified action/edit dialog */}
      {activeCase && (
        <WaitingCaseActionDialog
          waitingCase={activeCase}
          onClose={() => setActiveCase(null)}
          onSuccess={() => { invalidateAll(); setActiveCase(null); }}
        />
      )}
    </ReportWatermark>
  );
}
