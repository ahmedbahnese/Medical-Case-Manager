import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetCase, useUpdateCase, useDeleteCase, CaseUpdateStatus, CaseUpdateArtificialRespiration, CaseUpdateCaseType } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  ArrowLeft, User, Phone, MapPin, Activity, 
  Calendar, FileText, Wind, Trash2, Edit, Save, X, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { LABELS, translate } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const { data: patient, isLoading, refetch } = useGetCase(caseId);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  // Local state for editing to avoid constant renders
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (patient && !isEditing) {
      setEditData(patient);
    }
  }, [patient, isEditing]);

  if (isLoading) return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  if (!patient) return <div className="p-8 text-center text-xl">الحالة غير موجودة</div>;

  const handleSave = () => {
    updateCase.mutate({
      id: caseId,
      data: {
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
      }
    }, {
      onSuccess: () => {
        setIsEditing(false);
        toast({ title: "تم التحديث", description: "تم حفظ التعديلات بنجاح" });
        refetch();
      },
      onError: () => {
        toast({ title: "خطأ", description: "لم يتم حفظ التعديلات", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    deleteCase.mutate({ id: caseId }, {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف الحالة بنجاح" });
        setLocation("/dashboard");
      }
    });
  };

  const handleDischarge = () => {
    updateCase.mutate({
      id: caseId,
      data: { status: 'discharged' }
    }, {
      onSuccess: () => {
        toast({ title: "تم الخروج", description: "تم تسجيل خروج المريض" });
        refetch();
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {patient.patientName}
              {!isEditing && (
                <Badge variant={patient.status === 'critical' ? 'destructive' : patient.status === 'discharged' ? 'outline' : 'default'}>
                  {translate(patient.status, LABELS.STATUS)}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-mono text-sm">{patient.fileNumber || 'بدون رقم ملف'}</span>
              <span>•</span>
              <span>القسم: {patient.departmentName}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 ml-2" /> إلغاء
              </Button>
              <Button onClick={handleSave} disabled={updateCase.isPending}>
                <Save className="h-4 w-4 ml-2" /> حفظ التعديلات
              </Button>
            </>
          ) : (
            <>
              {patient.status !== 'discharged' && (
                <Button variant="secondary" onClick={handleDischarge}>
                  تسجيل خروج
                </Button>
              )}
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 ml-2" /> تعديل
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> تأكيد الحذف
                    </DialogTitle>
                    <DialogDescription>
                      هل أنت متأكد من رغبتك في حذف ملف المريض ({patient.patientName})؟ هذا الإجراء لا يمكن التراجع عنه.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}>إلغاء</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteCase.isPending}>
                      نعم، احذف الملف
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Info Sidebar */}
        <Card className="md:col-span-1 h-fit shadow-sm bg-muted/10">
          <CardHeader>
            <CardTitle className="text-lg border-b pb-2">بيانات شخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> العمر</p>
              {isEditing ? (
                <Input value={editData.age || ''} onChange={e => setEditData({...editData, age: e.target.value})} />
              ) : (
                <p className="font-medium">{patient.age || '-'}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> ولي الأمر</p>
              {isEditing ? (
                <Input value={editData.parentName || ''} onChange={e => setEditData({...editData, parentName: e.target.value})} />
              ) : (
                <p className="font-medium">{patient.parentName || '-'}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> رقم الهاتف</p>
              {isEditing ? (
                <Input dir="ltr" value={editData.parentPhone || ''} onChange={e => setEditData({...editData, parentPhone: e.target.value})} />
              ) : (
                <p className="font-medium font-mono text-right">{patient.parentPhone || '-'}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> الرقم القومي</p>
              {isEditing ? (
                <Input dir="ltr" value={editData.nationalId || ''} onChange={e => setEditData({...editData, nationalId: e.target.value})} />
              ) : (
                <p className="font-medium font-mono text-right">{patient.nationalId || '-'}</p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">تاريخ الدخول</p>
                <p className="text-sm font-medium">{format(new Date(patient.admissionDate), 'PPP p', { locale: ar })}</p>
              </div>
              {patient.dischargeDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">تاريخ الخروج</p>
                  <p className="text-sm font-medium">{format(new Date(patient.dischargeDate), 'PPP p', { locale: ar })}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Medical Status Card */}
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg">الحالة الطبية الحالية</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>حالة المريض</Label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABELS.STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-muted/30 rounded-md font-medium">
                    {translate(patient.status, LABELS.STATUS)}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>التنفس الصناعي</Label>
                {isEditing ? (
                  <Select value={editData.artificialRespiration} onValueChange={v => setEditData({...editData, artificialRespiration: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABELS.ARTIFICIAL_RESPIRATION).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={`p-3 rounded-md font-medium flex items-center gap-2 ${patient.artificialRespiration !== 'no' ? 'bg-teal-500/10 text-teal-600' : 'bg-muted/30'}`}>
                    {patient.artificialRespiration !== 'no' && <Wind className="h-4 w-4" />}
                    {translate(patient.artificialRespiration, LABELS.ARTIFICIAL_RESPIRATION)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-base text-primary flex items-center gap-2">
                  <Activity className="h-4 w-4" /> التشخيص
                </Label>
                {isEditing ? (
                  <Textarea value={editData.diagnosis || ''} onChange={e => setEditData({...editData, diagnosis: e.target.value})} className="h-24" />
                ) : (
                  <div className="bg-muted/10 p-4 rounded-md min-h-24 border whitespace-pre-wrap">
                    {patient.diagnosis || 'لم يكتب'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base text-primary flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> الأعراض الحالية
                </Label>
                {isEditing ? (
                  <Textarea value={editData.symptoms || ''} onChange={e => setEditData({...editData, symptoms: e.target.value})} />
                ) : (
                  <div className="bg-muted/10 p-4 rounded-md min-h-20 border whitespace-pre-wrap">
                    {patient.symptoms || 'لم يكتب'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4" /> خطة العلاج المتبعة
                </Label>
                {isEditing ? (
                  <Textarea value={editData.treatment || ''} onChange={e => setEditData({...editData, treatment: e.target.value})} className="h-32" />
                ) : (
                  <div className="bg-muted/10 p-4 rounded-md min-h-32 border whitespace-pre-wrap">
                    {patient.treatment || 'لم يكتب'}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-base text-primary">ملاحظات إضافية</Label>
                {isEditing ? (
                  <Textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} />
                ) : (
                  <div className="bg-muted/10 p-4 rounded-md border whitespace-pre-wrap">
                    {patient.notes || 'لا يوجد ملاحظات'}
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
