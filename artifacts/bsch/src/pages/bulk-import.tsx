import { useState } from "react";
import { Link } from "wouter";
import { useBulkImportCases, useGetDepartments, useCreateCase } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Bot, Sparkles, CheckCircle2, ArrowRight, Upload, RefreshCw } from "lucide-react";

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

// Map respiration codes from parsed text to DB values
const RESP_LABELS: Record<string, string> = {
  no: "لا يوجد",
  vent: "تنفس آلي (Vent)",
  high_frequency: "تردد عالي (HF)",
  cpap: "CPAP",
  standby: "استعداد",
};

export default function BulkImport() {
  const [text, setText] = useState("");
  const [defaultDeptId, setDefaultDeptId] = useState<string>("");
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [parsedCases, setParsedCases] = useState<ParsedCase[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [caseDepts, setCaseDepts] = useState<Record<number, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const { data: departments } = useGetDepartments();
  const bulkImport = useBulkImportCases();
  const createCase = useCreateCase();
  const { toast } = useToast();

  const handleAnalyze = () => {
    if (!text.trim()) {
      toast({ description: "الرجاء إدخال النص للتحليل", variant: "destructive" });
      return;
    }
    bulkImport.mutate(
      { data: { text, departmentId: defaultDeptId && defaultDeptId !== "none" ? parseInt(defaultDeptId) : undefined } },
      {
        onSuccess: (res) => {
          const cases = res.parsed as ParsedCase[];
          setParsedCases(cases);
          // Select all by default
          setSelected(new Set(cases.map((_, i) => i)));
          // Pre-fill department from parsed data or default
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
          toast({ title: "اكتمل التحليل", description: `تم استخراج ${cases.length} حالة، راجعها قبل الحفظ.` });
        },
        onError: () => {
          toast({ title: "فشل التحليل", description: "حدث خطأ أثناء معالجة النص", variant: "destructive" });
        }
      }
    );
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(parsedCases.map((_, i) => i)));
    else setSelected(new Set());
  };

  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const handleConfirmImport = async () => {
    if (selected.size === 0) {
      toast({ description: "اختر حالة واحدة على الأقل للاستيراد", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    let count = 0;
    for (const i of selected) {
      const c = parsedCases[i];
      const deptId = caseDepts[i] ? parseInt(caseDepts[i]) : null;
      if (!deptId) {
        toast({ description: `الحالة "${c.patientName}" بدون قسم — تم تخطيها`, variant: "destructive" });
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
      } catch { /* skip invalid */ }
    }
    setImportedCount(count);
    setStep("done");
    setIsImporting(false);
    toast({ title: "تم الاستيراد!", description: `حُفظت ${count} حالة بنجاح في قاعدة البيانات.` });
  };

  const reset = () => {
    setText("");
    setDefaultDeptId("");
    setParsedCases([]);
    setSelected(new Set());
    setCaseDepts({});
    setImportedCount(0);
    setStep("input");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-lg"><Bot className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-3xl font-bold">الاستيراد الذكي (AI)</h1>
          <p className="text-muted-foreground mt-1">لصق النص → تحليل واستخراج → مراجعة واختيار → حفظ</p>
        </div>
        {step !== "input" && (
          <Button variant="outline" className="mr-auto gap-2" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> بدء من جديد
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {["input","review","done"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step === s ? "bg-primary text-primary-foreground" :
              ["input","review","done"].indexOf(step) > i ? "bg-primary/30 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>{i+1}</div>
            <span className={step === s ? "font-semibold text-primary" : "text-muted-foreground"}>
              {s === "input" ? "إدخال النص" : s === "review" ? "مراجعة النتائج" : "اكتمل الاستيراد"}
            </span>
            {i < 2 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Input */}
      {step === "input" && (
        <div className="grid md:grid-cols-5 gap-6">
          <Card className="md:col-span-3 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> النص المراد تحليله
              </CardTitle>
              <CardDescription>الصق بيان الحالات من واتساب أو تقرير طبي. سيستخرج النظام الأسماء والتشخيصات تلقائياً.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">القسم الافتراضي للحالات</label>
                <Select value={defaultDeptId} onValueChange={setDefaultDeptId}>
                  <SelectTrigger><SelectValue placeholder="اختر قسمًا (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم افتراضي</SelectItem>
                    {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder={"مثال:\n1- محمد أحمد، 5 شهور، التهاب رئوي\n2- سارة إبراهيم، 3 أيام، HFNC\n..."}
                className="h-72 font-mono text-sm resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
                dir="auto"
              />
              <Button onClick={handleAnalyze} disabled={bulkImport.isPending || !text.trim()} className="w-full gap-2" size="lg">
                {bulkImport.isPending ? "جاري التحليل..." : "تحليل النص بالذكاء الاصطناعي"}
                <Bot className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">تعليمات التنسيق</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>النظام يتعرف تلقائياً على:</p>
              <ul className="space-y-2 list-none">
                {[
                  ["الاسم", "أي نص في بداية السطر"],
                  ["السن", "بعد كلمة العمر / سن / عمره"],
                  ["التشخيص", "بعد التشخيص / الحالة / مرض"],
                  ["الهاتف", "بعد هاتف / موبايل / رقم"],
                  ["التنفس", "فنت / HFNC / CPAP / تردد عالي"],
                ].map(([k, v]) => (
                  <li key={k} className="flex gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">{k}</Badge>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-muted/40 rounded-lg text-xs">
                <p className="font-semibold mb-1">مثال مثالي:</p>
                <pre className="whitespace-pre-wrap leading-relaxed text-right" dir="rtl">
{`1- أحمد محمد
السن: 3 أيام
التشخيص: التهاب رئوي
التنفس: HFNC
الهاتف: 01012345678`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Review with checkboxes */}
      {step === "review" && (
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>نتائج التحليل — {parsedCases.length} حالة مستخرجة</CardTitle>
                <CardDescription>راجع البيانات وحدد القسم لكل حالة، ثم اختر ما تريد استيراده.</CardDescription>
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
                      <Checkbox
                        checked={selected.size === parsedCases.length && parsedCases.length > 0}
                        onCheckedChange={(c) => toggleAll(!!c)}
                      />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>السن</TableHead>
                    <TableHead>التشخيص</TableHead>
                    <TableHead>التنفس الصناعي</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>القسم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedCases.map((c, i) => (
                    <TableRow key={i} className={selected.has(i) ? "bg-primary/5" : "opacity-50"}>
                      <TableCell>
                        <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleOne(i)} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-semibold">{c.patientName}</TableCell>
                      <TableCell className="text-sm">{c.age ?? "—"}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{c.diagnosis ?? "—"}</TableCell>
                      <TableCell>
                        {c.artificialRespiration && c.artificialRespiration !== "no" ? (
                          <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-xs">
                            {RESP_LABELS[c.artificialRespiration] ?? c.artificialRespiration}
                          </Badge>
                        ) : <span className="text-muted-foreground text-xs">لا يوجد</span>}
                      </TableCell>
                      <TableCell className="text-xs">{c.parentPhone ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={caseDepts[i] ?? ""}
                          onValueChange={(v) => setCaseDepts(prev => ({ ...prev, [i]: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue placeholder="اختر قسم" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments?.map(d => (
                              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                            ))}
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
                سيتم استيراد <span className="font-bold text-foreground">{selected.size}</span> حالة من أصل {parsedCases.length}
              </p>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting || selected.size === 0}
                className="gap-2"
                size="lg"
              >
                {isImporting ? "جاري الحفظ..." : `استيراد ${selected.size} حالة`}
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Done */}
      {step === "done" && (
        <Card className="border-primary/30 shadow-md">
          <CardContent className="pt-12 pb-10 flex flex-col items-center text-center gap-6">
            <div className="bg-primary/20 rounded-full p-6">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">اكتمل الاستيراد بنجاح!</h2>
              <p className="text-muted-foreground">تم حفظ <span className="text-primary font-bold text-xl">{importedCount}</span> حالة في قاعدة البيانات.</p>
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
