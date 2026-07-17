import { useState } from "react";
import {
  useGetWaitingCases, useUpdateWaitingCase, useDeleteWaitingCase,
  useCreateWaitingCase, useGetDepartments, useCreateCase,
  WaitingCaseUpdateStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users, Clock, CheckCircle2, XCircle, Trash2, Plus, Printer,
  ChevronDown, ChevronUp, FileText, Edit2, Square, CheckSquare, Download
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
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Section = "reception" | "servo";

const EXIT_REASONS = [
  { value: "improved", label: "تحسن / دخل القسم" },
  { value: "request", label: "خروج حسب الطلب" },
  { value: "transferred", label: "تحويل لمستشفى أخرى" },
  { value: "no_bed", label: "رفض (لا يوجد سرير)" },
];

const EMPTY_FORM = {
  patientName: "", age: "", diagnosis: "", parentPhone: "", nationalId: "",
  careType: "intensive_care_high", artificialRespiration: "no",
  centralRoomRequired: false, centralRoomCode: "",
};

/* ─────────────────────────── Word export ─────────────────────────── */
function buildWaitingWordHtml(cases: any[], title: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const rows = cases.map((c, i) => `
    <tr style="${i%2===0?'':'background:#f5f5f5'}">
      <td style="text-align:center">${i+1}</td>
      <td><strong>${c.patientName}</strong></td>
      <td>${c.age ?? "—"}</td>
      <td>${c.diagnosis ?? "—"}</td>
      <td>${translate(c.careType, LABELS.CARE_TYPES)}</td>
      <td>${translate(c.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</td>
      <td>${c.centralRoomRequired ? (c.centralRoomCode ? `غرفة مركزية: ${c.centralRoomCode}` : "✓ مطلوب") : "—"}</td>
      <td>${c.parentPhone ?? "—"}</td>
    </tr>`).join("");
  return `
    <div class="header">
      <h2>مستشفى الأطفال المتخصص بالبحيرة — BSCH</h2>
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

/* ─────────────────────────── Add Form ─────────────────────────── */
function AddForm({ section, onSuccess }: { section: Section; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const create = useCreateWaitingCase();
  const f = (k: keyof typeof EMPTY_FORM, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.patientName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    create.mutate({ data: { ...form, section } as any }, {
      onSuccess: () => {
        toast.success("تمت الإضافة لقائمة الانتظار");
        setForm({ ...EMPTY_FORM });
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
        <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> إضافة حالة للانتظار — {section === "servo" ? "سيرفو" : "استقبال"}</span>
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
              <Label className="text-xs">نوع الرعاية</Label>
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

/* ─────────────────────────── Edit Dialog ─────────────────────────── */
function EditWaitingCaseDialog({ waitingCase, onClose, onSuccess }: { waitingCase: any; onClose: () => void; onSuccess: () => void }) {
  const update = useUpdateWaitingCase();
  const [form, setForm] = useState({
    patientName: waitingCase.patientName ?? "",
    age: waitingCase.age ?? "",
    diagnosis: waitingCase.diagnosis ?? "",
    parentPhone: waitingCase.parentPhone ?? "",
    careType: waitingCase.careType ?? "intensive_care_high",
    artificialRespiration: waitingCase.artificialRespiration ?? "no",
    centralRoomRequired: waitingCase.centralRoomRequired ?? false,
    centralRoomCode: waitingCase.centralRoomCode ?? "",
  });
  const f = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    update.mutate({ id: waitingCase.id, data: form as any }, {
      onSuccess: () => { toast.success("تم تحديث البيانات"); onSuccess(); onClose(); },
      onError: (e: any) => toast.error("خطأ: " + (e?.response?.data?.error ?? e.message)),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" /> تعديل بيانات الحالة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">اسم المريض *</Label>
            <Input value={form.patientName} onChange={e => f("patientName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">السن</Label>
              <Input value={form.age} onChange={e => f("age", e.target.value)} placeholder="3 أيام" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الهاتف</Label>
              <Input dir="ltr" value={form.parentPhone} onChange={e => f("parentPhone", e.target.value)} placeholder="01X..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">نوع الرعاية</Label>
              <Select value={form.careType} onValueChange={v => f("careType", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS.CARE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">التنفس</Label>
              <Select value={form.artificialRespiration} onValueChange={v => f("artificialRespiration", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">التشخيص</Label>
            <Textarea value={form.diagnosis} onChange={e => f("diagnosis", e.target.value)} rows={2} className="resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="cr-edit" checked={form.centralRoomRequired} onCheckedChange={v => f("centralRoomRequired", !!v)} />
            <Label htmlFor="cr-edit" className="text-xs cursor-pointer">يحتاج غرفة مركزية</Label>
            {form.centralRoomRequired && (
              <Input value={form.centralRoomCode} onChange={e => f("centralRoomCode", e.target.value)}
                placeholder="كود الغرفة" className="h-8 w-32" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Admit Dialog ─────────────────────────── */
function AdmitDialog({ waitingCase, onClose, onSuccess }: { waitingCase: any; onClose: () => void; onSuccess: () => void }) {
  const { data: departments } = useGetDepartments();
  const [deptId, setDeptId] = useState("");
  const [mode, setMode] = useState<"admit" | "exit">("admit");
  const [exitReason, setExitReason] = useState("improved");
  const updateStatus = useUpdateWaitingCase();
  const createCase = useCreateCase();

  const handleConfirm = () => {
    if (mode === "admit") {
      if (!deptId) { toast.error("الرجاء اختيار القسم"); return; }
      const dept = departments?.find(d => d.id.toString() === deptId);
      createCase.mutate({
        data: {
          departmentId: parseInt(deptId),
          patientName: waitingCase.patientName,
          age: waitingCase.age ?? undefined,
          diagnosis: waitingCase.diagnosis ?? undefined,
          artificialRespiration: (waitingCase.artificialRespiration ?? "no") as any,
          caseType: dept ? deptTypeToCaseType(dept.departmentType as string) as any : "intensive_care_high",
          admissionDate: new Date().toISOString(),
        }
      }, {
        onSuccess: () => {
          updateStatus.mutate({ id: waitingCase.id, data: { status: "admitted" as WaitingCaseUpdateStatus } }, {
            onSuccess: () => { toast.success("تم نقل الحالة للقسم بنجاح"); onSuccess(); onClose(); },
          });
        },
        onError: (e: any) => toast.error("خطأ في الإضافة: " + (e?.response?.data?.error ?? e.message))
      });
    } else {
      updateStatus.mutate({ id: waitingCase.id, data: { status: "cancelled" as WaitingCaseUpdateStatus } }, {
        onSuccess: () => { toast.success("تم تسجيل الخروج"); onSuccess(); onClose(); },
        onError: (e: any) => toast.error("خطأ: " + e.message)
      });
    }
  };

  const isPending = updateStatus.isPending || createCase.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            إجراء — <span className="font-bold">{waitingCase.patientName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={mode === "admit" ? "default" : "outline"} onClick={() => setMode("admit")} className="w-full gap-1">
              <CheckCircle2 className="h-4 w-4" /> دخول القسم
            </Button>
            <Button variant={mode === "exit" ? "secondary" : "outline"} onClick={() => setMode("exit")} className="w-full gap-1">
              <XCircle className="h-4 w-4" /> خروج / إلغاء
            </Button>
          </div>

          {mode === "admit" && (
            <div className="space-y-2">
              <Label>اختر القسم المراد الدخول إليه</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
                <SelectContent>
                  {(departments as any[] ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name} — شاغر: {d.capacity - d.activeCasesCount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">ستُنشأ حالة نشطة تلقائياً في القسم المختار</p>
            </div>
          )}

          {mode === "exit" && (
            <div className="space-y-2">
              <Label>سبب الخروج / الإلغاء</Label>
              <Select value={exitReason} onValueChange={setExitReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Case info */}
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1 border">
            <p><strong>التشخيص:</strong> {waitingCase.diagnosis ?? "—"}</p>
            <p><strong>السن:</strong> {waitingCase.age ?? "—"}</p>
            <p><strong>نوع الرعاية:</strong> {translate(waitingCase.careType, LABELS.CARE_TYPES)}</p>
            <p><strong>التنفس:</strong> {translate(waitingCase.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}</p>
            {waitingCase.centralRoomRequired && (
              <p className="text-red-600 font-semibold"><strong>غرفة مركزية:</strong> {waitingCase.centralRoomCode || "مطلوب"}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "جاري التنفيذ..." : "تأكيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Cases Table ─────────────────────────── */
function CasesTable({ cases, onAction, onEdit, onDelete, isLoading, selectedIds, onToggle, onToggleAll }: {
  cases: any[]; onAction: (c: any) => void; onEdit: (c: any) => void; onDelete: (c: any) => void;
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
            return (
              <TableRow key={c.id} className={c.centralRoomRequired ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}>
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
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="تعديل"
                      onClick={() => onEdit(c)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-0.5 px-2"
                      onClick={() => onAction(c)}>
                      <CheckCircle2 className="h-3 w-3" /> إجراء
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
  const [admitCase, setAdmitCase] = useState<any>(null);
  const [editCase, setEditCase] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

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
      onSuccess: () => { toast.success(`تم حذف ${c.patientName}`); setSelectedIds(prev => { const n=new Set(prev); n.delete(c.id); return n; }); invalidateAll(); },
      onError: (e: any) => toast.error("خطأ: " + e.message)
    });
  };

  const casesArr = (casesRaw ?? []) as any[];

  const toggleId = (id: number) => setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = (all: boolean) => setSelectedIds(all ? new Set(casesArr.map(c => c.id)) : new Set());
  const selectedCases = casesArr.filter(c => selectedIds.has(c.id));

  const handleExportWord = () => {
    const toExport = selectedCases.length > 0 ? selectedCases : casesArr;
    const title = section === "servo" ? "سيرفو" : "استقبال";
    const html = buildWaitingWordHtml(toExport, title);
    exportWordDoc(html, `waiting-${section}-${new Date().toISOString().slice(0,10)}.doc`);
  };

  const handlePrint = () => window.print();

  const servoCount = (servoAll ?? []).length;
  const recepCount = (recepAll ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">قوائم الانتظار</h1>
          <p className="text-muted-foreground text-sm">إدارة حالات الانتظار — استقبال وسيرفو</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedCases.length > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-1">{selectedCases.length} محدد</Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportWord}>
            <FileText className="h-4 w-4" /> {selectedCases.length > 0 ? `Word (${selectedCases.length})` : "Word"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> طباعة
          </Button>
        </div>
      </div>

      <Tabs value={section} onValueChange={v => { setSection(v as Section); setSelectedIds(new Set()); }}>
        <TabsList className="w-full no-print">
          <TabsTrigger value="reception" className="flex-1 gap-2">
            استقبال
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

            {/* Header for print */}
            <div className="hidden print:block text-center border-b pb-2 mb-2">
              <h2 className="font-bold text-lg">بيان قائمة انتظار — {sec === "servo" ? "سيرفو" : "الاستقبال"}</h2>
              <p className="text-sm">{new Date().toLocaleDateString("ar-EG", { weekday:"long", day:"2-digit", month:"2-digit", year:"numeric" })}</p>
            </div>

            {/* Cases table */}
            <CasesTable
              cases={casesArr}
              isLoading={isLoading}
              onAction={setAdmitCase}
              onEdit={setEditCase}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onToggleAll={toggleAll}
            />

            {casesArr.length > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground no-print">
                <span>إجمالي: <strong>{casesArr.length}</strong> حالة</span>
                {selectedCases.length > 0 && (
                  <span className="text-primary">محدد: {selectedCases.length}</span>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {admitCase && (
        <AdmitDialog
          waitingCase={admitCase}
          onClose={() => setAdmitCase(null)}
          onSuccess={() => { invalidateAll(); setAdmitCase(null); }}
        />
      )}

      {editCase && (
        <EditWaitingCaseDialog
          waitingCase={editCase}
          onClose={() => setEditCase(null)}
          onSuccess={invalidateAll}
        />
      )}
    </div>
  );
}
