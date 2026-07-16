import { useState } from "react";
import { Link } from "wouter";
import { useBulkImportCases, useGetDepartments, useCreateCase } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Sparkles, CheckCircle2, ArrowRight, Upload, RefreshCw, Edit } from "lucide-react";
import { LABELS } from "@/lib/constants";

type ParsedCase = {
  patientName: string;
  age: string | null;
  diagnosis: string | null;
  parentPhone: string | null;
  nationalId: string | null;
  notes: string | null;
  artificialRespiration: string | null;
  departmentId: number | null;
};

type EditableCase = ParsedCase & { _editing?: boolean };

export default function BulkImport() {
  const [text, setText] = useState("");
  const [defaultDeptId, setDefaultDeptId] = useState<string>("");
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [parsedCases, setParsedCases] = useState<EditableCase[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [caseDepts, setCaseDepts] = useState<Record<number, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const { data: departments } = useGetDepartments();
  const bulkImport = useBulkImportCases();
  const createCase = useCreateCase();

  const handleAnalyze = () => {
    if (!text.trim()) {
      toast.error("الرجاء إدخال النص للتحليل");
      return;
    }
    bulkImport.mutate(
      { data: { text, departmentId: defaultDeptId && defaultDeptId !== "none" ? parseInt(defaultDeptId) : undefined } },
      {
        onSuccess: (res) => {
          const cases = (res.parsed as EditableCase[]).map(c => ({ ...c }));
          setParsedCases(cases);
          setSelected(new Set(cases.map((_, i) => i)));
          const depts: Record<number, string> = {};
          cases.forEach((c, i) => {
            depts[i] = c.departmentId
              ? c.departmentId.toString()
              : defaultDeptId && defaultDeptId !== "none"
              ? defaultDeptId
              : "";
          });
          setCaseDepts(depts);
          setStep("review");
          toast.success(`تم استخراج ${cases.length} حالة — راجعها قبل الحفظ`);
        },
        onError: (e: any) => toast.error("فشل التحليل: " + e.message)
      }
    );
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(parsedCases.map((_, i) => i)) : new Set());
  };

  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const updateCase = (i: number, field: keyof ParsedCase, value: string | null) => {
    setParsedCases(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const handleConfirmImport = async () => {
    if (selected.size === 0) {
      toast.error("اختر حالة واحدة على الأقل");
      return;
    }
    setIsImporting(true);
    let count = 0;
    const errors: string[] = [];

    for (const i of selected) {
      const c = parsedCases[i];
      const deptId = caseDepts[i] ? parseInt(caseDepts[i]) : null;
      if (!deptId) {
        errors.push(`"${c.patientName}": لم يتم تحديد قسم`);
        continue;
      }
      try {
        await createCase.mutateAsync({
          data: {
            patientName: c.patientName,
            departmentId: deptId,
            age: c.age ?? undefined,
            diagnosis: c.diagnosis ?? undefined,
            notes: c.notes ?? undefined,
            parentPhone: c.parentPhone ?? undefined,
            nationalId: c.nationalId ?? undefined,
            artificialRespiration: (c.artificialRespiration as any) ?? "no",
            caseType: "intensive_care_high",
            status: "active",
          }
        });
        count++;
      } catch (e: any) {
        errors.push(`"${c.patientName}": ${e.message}`);
      }
    }

    setImportedCount(count);
    setStep("done");
    setIsImporting(false);

    if (errors.length > 0) {
      toast.warning(`تم استيراد ${count} حالة. ${errors.length} حالة بها مشكلة.`);
    } else {
      toast.success(`تم استيراد ${count} حالة بنجاح`);
    }
  };

  const reset = () => {
    setText(""); setDefaultDeptId(""); setParsedCases([]);
    setSelected(new Set()); setCaseDepts({});
    setImportedCount(0); setStep("input");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-lg"><Bot className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">الاستيراد الذكي</h1>
          <p className="text-muted-foreground text-sm">لصق النص ← تحليل ← مراجعة وتعديل ← حفظ</p>
        </div>
        {step !== "input" && (
          <Button variant="outline" size="sm" className="mr-auto gap-2" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> بداية جديدة
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[{ key: "input", label: "إدخال النص" }, { key: "review", label: "مراجعة وتعديل" }, { key: "done", label: "اكتمل" }].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step === s.key ? "bg-primary text-primary-foreground" :
              ["input", "review", "done"].indexOf(step) > i ? "bg-primary/30 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>{i + 1}</div>
            <span className={step === s.key ? "font-semibold text-primary" : "text-muted-foreground text-xs"}>{s.label}</span>
            {i < 2 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {step === "input" && (
        <div className="grid md:grid-cols-5 gap-6">
          <Card className="md:col-span-3 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> النص المراد تحليله
              </CardTitle>
              <CardDescription className="text-xs">الصق بيان الحالات من واتساب أو تقرير طبي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">القسم الافتراضي (اختياري)</label>
                <Select value={defaultDeptId} onValueChange={setDefaultDeptId}>
                  <SelectTrigger><SelectValue placeholder="اختر قسمًا" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم افتراضي</SelectItem>
                    {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder={"مثال:\n1- محمد أحمد، 5 شهور\nالتشخيص: التهاب رئوي\nالتنفس: HFNC\nالهاتف: 01012345678\n\n2- سارة إبراهيم، 3 أيام\n..."}
                className="h-64 font-mono text-sm resize-none"
                value={text}
                onChange={e => setText(e.target.value)}
                dir="auto"
              />
              <Button onClick={handleAnalyze} disabled={bulkImport.isPending || !text.trim()} className="w-full gap-2" size="lg">
                {bulkImport.isPending ? "جاري التحليل..." : "تحليل النص بالذكاء الاصطناعي"}
                <Bot className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-dashed">
            <CardHeader><CardTitle className="text-sm">كيفية كتابة البيان</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>النظام يتعرف تلقائياً على:</p>
              <ul className="space-y-1">
                {[["الاسم", "سطر مستقل في بداية الحالة"],["السن", "بعد العمر / سن / عمره"],["التشخيص", "بعد التشخيص / dx"],["الهاتف", "بعد هاتف / موبايل"],["التنفس", "فنت / HFNC / CPAP / تردد عالي"]].map(([k, v]) => (
                  <li key={k} className="flex gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">{k}</Badge> {v}
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-2 bg-muted/40 rounded text-xs">
                <p className="font-semibold mb-1">مثال مثالي:</p>
                <pre className="whitespace-pre-wrap text-right" dir="rtl">{`1- أحمد محمد
السن: 3 أيام
التشخيص: التهاب رئوي
التنفس: HFNC
الهاتف: 01012345678`}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "review" && (
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>{parsedCases.length} حالة مستخرجة — راجع وعدّل البيانات</CardTitle>
                <CardDescription className="text-xs mt-1">يمكنك تعديل أي حقل مباشرة في الجدول قبل الاستيراد</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{selected.size} محدد</span>
                <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>تحديد الكل</Button>
                <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>إلغاء الكل</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selected.size === parsedCases.length && parsedCases.length > 0}
                        onCheckedChange={c => toggleAll(!!c)} />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>السن</TableHead>
                    <TableHead>التشخيص</TableHead>
                    <TableHead>التنفس</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>القسم *</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedCases.map((c, i) => (
                    <TableRow key={i} className={selected.has(i) ? "bg-primary/5" : "opacity-60"}>
                      <TableCell>
                        <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleOne(i)} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Input value={c.patientName} onChange={e => updateCase(i, "patientName", e.target.value)}
                          className="h-7 text-xs min-w-[120px]" />
                      </TableCell>
                      <TableCell>
                        <Input value={c.age ?? ""} onChange={e => updateCase(i, "age", e.target.value || null)}
                          className="h-7 text-xs w-20" placeholder="—" />
                      </TableCell>
                      <TableCell>
                        <Input value={c.diagnosis ?? ""} onChange={e => updateCase(i, "diagnosis", e.target.value || null)}
                          className="h-7 text-xs min-w-[140px]" placeholder="—" />
                      </TableCell>
                      <TableCell>
                        <Select value={c.artificialRespiration ?? "no"} onValueChange={v => updateCase(i, "artificialRespiration", v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={c.parentPhone ?? ""} onChange={e => updateCase(i, "parentPhone", e.target.value || null)}
                          className="h-7 text-xs w-28" dir="ltr" placeholder="—" />
                      </TableCell>
                      <TableCell>
                        <Select value={caseDepts[i] ?? ""} onValueChange={v => setCaseDepts(prev => ({ ...prev, [i]: v }))}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="اختر" /></SelectTrigger>
                          <SelectContent>
                            {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t flex items-center justify-between bg-muted/30">
              <p className="text-sm text-muted-foreground">
                سيتم استيراد <span className="font-bold text-foreground">{selected.size}</span> حالة
              </p>
              <Button onClick={handleConfirmImport} disabled={isImporting || selected.size === 0} className="gap-2">
                {isImporting ? "جاري الحفظ..." : `استيراد ${selected.size} حالة`}
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card className="border-primary/30 shadow-md">
          <CardContent className="pt-12 pb-10 flex flex-col items-center text-center gap-6">
            <div className="bg-primary/20 rounded-full p-6">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">اكتمل الاستيراد بنجاح!</h2>
              <p className="text-muted-foreground">تم حفظ <span className="text-primary font-bold text-xl">{importedCount}</span> حالة.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={reset} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> استيراد مجموعة أخرى
              </Button>
              <Button asChild className="gap-2">
                <Link href="/dashboard">
                  الذهاب للوحة التحكم <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
