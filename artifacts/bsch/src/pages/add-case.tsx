import { useState } from "react";
import { useLocation } from "wouter";
import { useGetDepartments, useCreateCase, CaseInputCaseType, CaseInputArtificialRespiration, CaseInputStatus } from "@workspace/api-client-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LABELS } from "@/lib/constants";
import { Plus, Bot, ArrowRight, CheckCircle2, Edit } from "lucide-react";
import BulkImport from "./bulk-import";

const formSchema = z.object({
  patientName: z.string().min(2, "الاسم مطلوب (حرفان على الأقل)"),
  departmentId: z.coerce.number().min(1, "يرجى اختيار القسم"),
  age: z.string().optional(),
  nationalId: z.string().optional(),
  fileNumber: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  diagnosis: z.string().optional(),
  symptoms: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  mobe: z.string().optional(),
  artificialRespiration: z.enum(["high_frequency", "vent", "cpap", "standby", "no"]).default("no"),
  status: z.enum(["active", "recovering", "critical"]).default("active"),
  admissionDate: z.string().optional(),
  ventilationStartDate: z.string().optional(),
  confirmSummary: z.boolean().refine(v => v === true, "يجب تأكيد صحة البيانات قبل الحفظ"),
});

type FormValues = z.infer<typeof formSchema>;

function ManualEntryForm() {
  const [, setLocation] = useLocation();
  const { data: departments } = useGetDepartments();
  const createCase = useCreateCase();
  const [showSummary, setShowSummary] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const initialDeptId = urlParams.get("departmentId");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: "",
      departmentId: initialDeptId ? parseInt(initialDeptId) : 0,
      age: "",
      nationalId: "",
      fileNumber: "",
      parentName: "",
      parentPhone: "",
      diagnosis: "",
      symptoms: "",
      treatment: "",
      notes: "",
      mobe: "",
      artificialRespiration: "no",
      status: "active",
      admissionDate: new Date().toISOString().slice(0, 16),
      ventilationStartDate: "",
      confirmSummary: false,
    },
  });

  const values = form.watch();
  const selectedDept = departments?.find(d => d.id === Number(values.departmentId));

  const onSubmit = (data: FormValues) => {
    const { confirmSummary, ...submitData } = data;
    createCase.mutate(
      {
        data: {
          ...submitData,
          caseType: (selectedDept?.departmentType as CaseInputCaseType) ?? "intensive_care_high",
          artificialRespiration: submitData.artificialRespiration as CaseInputArtificialRespiration,
          status: submitData.status as CaseInputStatus,
          admissionDate: submitData.admissionDate ? new Date(submitData.admissionDate).toISOString() : undefined,
          ventilationStartDate: submitData.ventilationStartDate ? new Date(submitData.ventilationStartDate).toISOString() : undefined,
        } as any
      },
      {
        onSuccess: (newCase) => {
          toast.success("تم إضافة الحالة بنجاح");
          setLocation(`/case/${newCase.id}`);
        },
        onError: (e: any) => toast.error("خطأ في الإضافة: " + e.message)
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Essential */}
          <Card className="col-span-2 border-t-4 border-t-primary shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">البيانات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="patientName" render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المريض رباعي *</FormLabel>
                  <FormControl><Input placeholder="أدخل الاسم الرباعي..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="departmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>القسم *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name} (شاغر: {d.capacity - d.activeCasesCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="admissionDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الدخول</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>حالة المريض</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">نشط (مستقر)</SelectItem>
                      <SelectItem value="critical">حرج (عناية مشددة)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Medical */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">البيانات الطبية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="diagnosis" render={({ field }) => (
                <FormItem>
                  <FormLabel>التشخيص المبدئي</FormLabel>
                  <FormControl><Textarea placeholder="التشخيص..." {...field} className="h-20" /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="artificialRespiration" render={({ field }) => (
                <FormItem>
                  <FormLabel>التنفس الصناعي</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={field.value !== "no" ? "border-primary/50 text-primary bg-primary/5" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              {values.artificialRespiration !== "no" && (
                <FormField control={form.control} name="ventilationStartDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ التوصيل على التنفس</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  </FormItem>
                )} />
              )}
            </CardContent>
          </Card>

          {/* Admin */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">البيانات الإدارية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="fileNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الملف</FormLabel>
                    <FormControl><Input dir="ltr" className="text-right" placeholder="MF-..." {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>العمر</FormLabel>
                    <FormControl><Input placeholder="5 شهور" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="parentName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ولي الأمر</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="parentPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl><Input dir="ltr" className="text-right" placeholder="01X..." {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="mobe" render={({ field }) => (
                <FormItem>
                  <FormLabel>MOBE</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        </div>

        {/* Summary Confirmation Checklist */}
        <Card className="shadow-sm bg-muted/20 border-yellow-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> ملخص البيانات والتأكيد
            </CardTitle>
            <CardDescription className="text-xs">راجع البيانات المدخلة قبل الحفظ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-background/60 p-3 rounded-lg border">
              <span><strong>الاسم:</strong> {values.patientName || "—"}</span>
              <span><strong>القسم:</strong> {selectedDept?.name || "—"}</span>
              <span><strong>العمر:</strong> {values.age || "—"}</span>
              <span><strong>الحالة:</strong> {values.status === "active" ? "نشط" : "حرج"}</span>
              <span><strong>التنفس:</strong> {LABELS.ARTIFICIAL_RESPIRATION[values.artificialRespiration as keyof typeof LABELS.ARTIFICIAL_RESPIRATION] || "—"}</span>
              <span><strong>التشخيص:</strong> {values.diagnosis ? values.diagnosis.substring(0, 30) + (values.diagnosis.length > 30 ? "..." : "") : "—"}</span>
            </div>
            <FormField control={form.control} name="confirmSummary" render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 mt-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">أقر بأن البيانات صحيحة وتمت مراجعتها</FormLabel>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t bg-background/50">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>إلغاء</Button>
            <Button type="submit" disabled={createCase.isPending} className="px-8">
              {createCase.isPending ? "جاري الحفظ..." : "حفظ الحالة"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

export default function AddCase() {
  const [mode, setMode] = useState<"choose" | "manual" | "import">("choose");

  if (mode === "manual") return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>← رجوع</Button>
        <div>
          <h1 className="text-2xl font-bold">تسجيل حالة جديدة</h1>
          <p className="text-muted-foreground text-sm">إدخال يدوي للبيانات</p>
        </div>
      </div>
      <ManualEntryForm />
    </div>
  );

  if (mode === "import") return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>← رجوع</Button>
        <div>
          <h1 className="text-2xl font-bold">الاستيراد الذكي</h1>
          <p className="text-muted-foreground text-sm">استخراج الحالات من النص</p>
        </div>
      </div>
      <BulkImport />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إضافة حالة</h1>
        <p className="text-muted-foreground mt-1">اختر طريقة الإدخال</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer border-2 hover:border-primary hover:shadow-md transition-all group"
          onClick={() => setMode("manual")}
        >
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-4">
            <div className="bg-primary/20 p-4 rounded-2xl group-hover:bg-primary/30 transition-colors">
              <Edit className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">إدخال حالة</h2>
              <p className="text-sm text-muted-foreground">إدخال بيانات المريض يدوياً مع ملخص للتأكيد</p>
            </div>
            <Button className="w-full mt-2">
              <Plus className="h-4 w-4 ml-2" /> إدخال يدوي
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer border-2 hover:border-primary hover:shadow-md transition-all group"
          onClick={() => setMode("import")}
        >
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-4">
            <div className="bg-primary/20 p-4 rounded-2xl group-hover:bg-primary/30 transition-colors">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">الاستيراد الذكي</h2>
              <p className="text-sm text-muted-foreground">الصق نص البيان وسيستخرج النظام الحالات تلقائياً</p>
            </div>
            <Button className="w-full mt-2" variant="secondary">
              <Bot className="h-4 w-4 ml-2" /> استيراد ذكي
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
