import { useLocation } from "wouter";
import { useGetDepartments, useCreateCase, CaseInputCaseType, CaseInputArtificialRespiration, CaseInputStatus } from "@workspace/api-client-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { LABELS, translate } from "@/lib/constants";
import { User, Phone, FileText, AlertCircle, Calendar } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  patientName: z.string().min(2, "الاسم مطلوب ويجب أن يكون حرفين على الأقل"),
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
  caseType: z.enum(["intensive_care_high", "intensive_care_medium", "picu", "incubator"]).optional(),
  artificialRespiration: z.enum(["high_frequency", "vent", "cpap", "standby", "no"]).default("no"),
  status: z.enum(["active", "recovering", "critical"]).default("active"),
  confirm1: z.boolean().refine(val => val === true, "يجب تأكيد البيانات"),
  confirm2: z.boolean().refine(val => val === true, "يجب مراجعة الحالة"),
});

export default function AddCase() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: departments } = useGetDepartments();
  const createCase = useCreateCase();

  // Parse departmentId from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const initialDeptId = urlParams.get('departmentId');

  const form = useForm<z.infer<typeof formSchema>>({
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
      artificialRespiration: "no",
      status: "active",
      confirm1: false,
      confirm2: false,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Exclude confirm fields from submission
    const { confirm1, confirm2, ...submitData } = values;
    
    // Convert to API types
    const dataToSend = {
      ...submitData,
      caseType: submitData.caseType as CaseInputCaseType | undefined,
      artificialRespiration: submitData.artificialRespiration as CaseInputArtificialRespiration,
      status: submitData.status as CaseInputStatus,
    };

    createCase.mutate(
      { data: dataToSend },
      {
        onSuccess: (newCase) => {
          toast({ title: "تم إضافة الحالة بنجاح", description: "تم تسجيل المريض في القسم المحدد" });
          setLocation(`/case/${newCase.id}`);
        },
        onError: () => {
          toast({ title: "حدث خطأ", description: "لم نتمكن من إضافة الحالة، يرجى المحاولة مرة أخرى", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">تسجيل حالة جديدة</h1>
        <p className="text-muted-foreground mt-2">إدخال بيانات مريض جديد للمستشفى</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Essential Info */}
            <Card className="col-span-2 shadow-sm border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-lg">البيانات الأساسية (إلزامية)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المريض رباعي</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم المريض..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>القسم المحول إليه</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر القسم" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map(d => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name} - السعة الشاغرة ({d.capacity - d.activeCasesCount})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Medical Info */}
            <Card className="col-span-2 md:col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">البيانات الطبية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التشخيص المبدئي</FormLabel>
                      <FormControl>
                        <Textarea placeholder="التشخيص..." {...field} className="h-20" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حالة المريض</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">نشط (مستقر)</SelectItem>
                            <SelectItem value="critical">حرج (عناية مشددة)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="artificialRespiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التنفس الصناعي</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className={field.value !== 'no' ? 'border-primary/50 text-primary bg-primary/5' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Admin Info */}
            <Card className="col-span-2 md:col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">البيانات الإدارية والاتصال</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الملف (اختياري)</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-right" placeholder="MF-..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العمر</FormLabel>
                        <FormControl>
                          <Input placeholder="مثال: 5 شهور, 3 أيام" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم ولي الأمر</FormLabel>
                        <FormControl>
                          <Input placeholder="اسم الأب أو الأم" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-right" placeholder="01X..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                    control={form.control}
                    name="nationalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرقم القومي</FormLabel>
                        <FormControl>
                          <Input dir="ltr" className="text-right" placeholder="14 رقم" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
            </Card>

          </div>

          <Card className="shadow-sm bg-muted/20 border-warning/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="confirm1"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 space-x-reverse">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>أقر بأن البيانات الأساسية (الاسم والقسم) صحيحة وتم مراجعتها.</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm2"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 space-x-reverse">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>تمت مناظرة الحالة وتسجيل الإجراءات الطبية الأولية.</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-background/50 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createCase.isPending} className="px-8">
                {createCase.isPending ? "جاري الحفظ..." : "حفظ الحالة وتأكيد الدخول"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
