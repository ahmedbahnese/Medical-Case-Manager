import { useState, useEffect, useRef } from "react";
import { useSettingsActions } from "@/contexts/settings-context";
import {
  Settings, Lock, Eye, EyeOff, Upload, Save, User, Plus, Trash2,
  Palette, Building2, Edit2, X, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

const SETTINGS_PASSWORD = "@Bahnasy";

const DEPT_TYPE_OPTIONS = [
  { value: "intensive_care_high",   label: "عناية مركزة عالية" },
  { value: "intensive_care_medium", label: "عناية مركزة متوسطة" },
  { value: "picu",                  label: "عناية أطفال (PICU)" },
  { value: "incubator_a",           label: "حاضنات أ" },
  { value: "incubator_b",           label: "حاضنات ب" },
  { value: "incubator_c",           label: "حاضنات ج" },
];

interface SettingsData {
  hospital_name?: string;
  logo_base64?: string;
  supervisors?: string;
  theme_color?: string;
  named_passwords?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
  capacity: number;
  departmentType: string;
  description?: string;
  activeCasesCount?: number;
}

interface NamedPassword { name: string; password: string }

export default function SettingsPage() {
  const { refreshSettings } = useSettingsActions();
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [hospitalName, setHospitalName] = useState("مستشفى الأطفال التخصصي بالبحيرة");
  const [loginPassword, setLoginPassword] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState("#2563eb");

  // Supervisors
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [newSupervisor, setNewSupervisor] = useState("");

  // Named passwords
  const [namedPasswords, setNamedPasswords] = useState<NamedPassword[]>([]);
  const [newNpName, setNewNpName] = useState("");
  const [newNpPassword, setNewNpPassword] = useState("");
  const [showNewNpPw, setShowNewNpPw] = useState(false);

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [editingDept, setEditingDept] = useState<number | null>(null);
  const [editDeptData, setEditDeptData] = useState<Partial<Department>>({});
  const [newDept, setNewDept] = useState({ name: "", code: "", capacity: 10, departmentType: "intensive_care_high", description: "" });
  const [showAddDept, setShowAddDept] = useState(false);

  const loadDepartments = async () => {
    try {
      const data = await apiGet<Department[]>("/api/departments");
      setDepartments(data);
    } catch {}
  };

  useEffect(() => {
    if (!unlocked) return;
    apiGet<SettingsData>(`/api/settings?_=${Date.now()}`).then(data => {
      if (data.hospital_name) setHospitalName(data.hospital_name);
      if (data.logo_base64) setLogoPreview(data.logo_base64);
      if (data.theme_color) setThemeColor(data.theme_color);
      if (data.supervisors) {
        try { setSupervisors(JSON.parse(data.supervisors)); } catch { setSupervisors([]); }
      }
      if (data.named_passwords) {
        try { setNamedPasswords(JSON.parse(data.named_passwords)); } catch { setNamedPasswords([]); }
      }
    }).catch(() => {});
    loadDepartments();
  }, [unlocked]);

  const handleUnlock = () => {
    if (pwInput === SETTINGS_PASSWORD) {
      setUnlocked(true);
      setPwInput("");
      toast.success("تم فتح لوحة الإعدادات");
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setLoading(true);
    try {
      await apiPost("/api/settings", { password: SETTINGS_PASSWORD, key, value });
      await refreshSettings();
      toast.success("تم حفظ الإعداد بنجاح");
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e.message ?? "خطأ غير معروف"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة كبير جداً (الحد 2 ميغابايت)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      saveSetting("logo_base64", base64);
    };
    reader.readAsDataURL(file);
  };

  /* ─── Supervisors ─── */
  const saveSupervisors = (list: string[]) => saveSetting("supervisors", JSON.stringify(list));
  const addSupervisor = () => {
    if (!newSupervisor.trim()) return;
    const updated = [...supervisors, newSupervisor.trim()];
    setSupervisors(updated); setNewSupervisor(""); saveSupervisors(updated);
  };
  const removeSupervisor = (i: number) => {
    const updated = supervisors.filter((_, idx) => idx !== i);
    setSupervisors(updated); saveSupervisors(updated);
  };

  /* ─── Named Passwords ─── */
  const saveNamedPasswords = (list: NamedPassword[]) => saveSetting("named_passwords", JSON.stringify(list));
  const addNamedPassword = () => {
    if (!newNpName.trim() || !newNpPassword.trim()) { toast.error("الاسم وكلمة المرور مطلوبان"); return; }
    const updated = [...namedPasswords, { name: newNpName.trim(), password: newNpPassword.trim() }];
    setNamedPasswords(updated); setNewNpName(""); setNewNpPassword(""); saveNamedPasswords(updated);
  };
  const removeNamedPassword = (i: number) => {
    const updated = namedPasswords.filter((_, idx) => idx !== i);
    setNamedPasswords(updated); saveNamedPasswords(updated);
  };

  /* ─── Departments ─── */
  const handleAddDept = async () => {
    if (!newDept.name.trim() || !newDept.code.trim()) { toast.error("الاسم والكود مطلوبان"); return; }
    setDeptLoading(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDept),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("تم إضافة القسم");
      setNewDept({ name: "", code: "", capacity: 10, departmentType: "intensive_care_high", description: "" });
      setShowAddDept(false);
      loadDepartments();
    } catch (e: any) { toast.error("خطأ: " + e.message); }
    finally { setDeptLoading(false); }
  };

  const handleSaveDept = async (id: number) => {
    setDeptLoading(true);
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDeptData),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("تم حفظ التعديلات");
      setEditingDept(null); setEditDeptData({});
      loadDepartments();
    } catch (e: any) { toast.error("خطأ: " + e.message); }
    finally { setDeptLoading(false); }
  };

  const handleDeleteDept = async (id: number) => {
    setDeptLoading(true);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("تم حذف القسم");
      loadDepartments();
    } catch (e: any) { toast.error("خطأ: " + e.message); }
    finally { setDeptLoading(false); }
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto space-y-6 mt-12">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الإعدادات</h1>
            <p className="text-muted-foreground text-sm">يتطلب كلمة مرور للدخول</p>
          </div>
        </div>
        <Card className="border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-2">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>أدخل كلمة مرور الإعدادات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleUnlock()}
                placeholder="كلمة المرور"
                dir="ltr"
                className="pr-10"
              />
              <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button className="w-full" onClick={handleUnlock}>دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
          <Settings className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground text-sm">إعدادات النظام والمستشفى</p>
        </div>
      </div>

      {/* Hospital Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">اسم المستشفى</CardTitle>
          <CardDescription className="text-xs">يظهر في الشريط الجانبي وفي التقارير والطباعة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={hospitalName} onChange={e => setHospitalName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveSetting("hospital_name", hospitalName)} placeholder="اسم المستشفى" />
            <Button variant="outline" disabled={loading} onClick={() => saveSetting("hospital_name", hospitalName)}>
              <Save className="h-4 w-4 ml-1" /> حفظ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">شعار المستشفى</CardTitle>
          <CardDescription className="text-xs">يظهر في الشريط الجانبي ورأس التقارير المطبوعة والمُصدَّرة</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-20 w-20 object-contain border rounded-lg p-1 bg-white" />
          ) : (
            <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/20">
              <Upload className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> {logoPreview ? "تغيير الشعار" : "رفع شعار"}
            </Button>
            {logoPreview && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1 block"
                onClick={() => { setLogoPreview(null); saveSetting("logo_base64", ""); }}>
                حذف الشعار
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> إدارة الأقسام
              </CardTitle>
              <CardDescription className="text-xs">إضافة أقسام جديدة أو تعديل أسمائها وطاقتها الاستيعابية أو حذفها</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddDept(s => !s)} className="gap-1">
              <Plus className="h-4 w-4" /> قسم جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new dept form */}
          {showAddDept && (
            <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
              <p className="text-sm font-medium">إضافة قسم جديد</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">اسم القسم *</Label>
                  <Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="مثال: العناية المركزة عالية" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الكود *</Label>
                  <Input value={newDept.code} onChange={e => setNewDept(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="ICU-A" className="h-8 text-sm" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">نوع القسم</Label>
                  <Select value={newDept.departmentType} onValueChange={v => setNewDept(p => ({ ...p, departmentType: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الطاقة الاستيعابية</Label>
                  <Input type="number" min={1} max={100} value={newDept.capacity}
                    onChange={e => setNewDept(p => ({ ...p, capacity: parseInt(e.target.value) || 10 }))}
                    className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddDept(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleAddDept} disabled={deptLoading} className="gap-1">
                  <Plus className="h-4 w-4" /> إضافة
                </Button>
              </div>
            </div>
          )}

          {/* Departments list */}
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد أقسام</p>
          ) : (
            <div className="space-y-2">
              {departments.map(dept => (
                <div key={dept.id} className="border rounded-lg p-3">
                  {editingDept === dept.id ? (
                    /* Edit form */
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">الاسم</Label>
                          <Input value={editDeptData.name ?? dept.name}
                            onChange={e => setEditDeptData(p => ({ ...p, name: e.target.value }))}
                            className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الكود</Label>
                          <Input value={editDeptData.code ?? dept.code}
                            onChange={e => setEditDeptData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                            className="h-8 text-sm" dir="ltr" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">النوع</Label>
                          <Select value={editDeptData.departmentType ?? dept.departmentType}
                            onValueChange={v => setEditDeptData(p => ({ ...p, departmentType: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DEPT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الطاقة الاستيعابية</Label>
                          <Input type="number" min={1} max={200}
                            value={editDeptData.capacity ?? dept.capacity}
                            onChange={e => setEditDeptData(p => ({ ...p, capacity: parseInt(e.target.value) || dept.capacity }))}
                            className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDept(null); setEditDeptData({}); }}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleSaveDept(dept.id)} disabled={deptLoading} className="gap-1">
                          <Check className="h-4 w-4" /> حفظ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display row */
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{dept.name}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{dept.code}</Badge>
                          <span className="text-xs text-muted-foreground">
                            طاقة: {dept.capacity} | مشغول: {dept.activeCasesCount ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setEditingDept(dept.id); setEditDeptData({}); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                          title="حذف القسم"
                          description={`هل أنت متأكد من حذف قسم "${dept.name}"؟ لا يمكن حذفه إذا كان يحتوي على حالات.`}
                          confirmLabel="حذف"
                          onConfirm={() => handleDeleteDept(dept.id)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supervisors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> المسئولون / المشرفون
          </CardTitle>
          <CardDescription className="text-xs">قائمة المسئولين التي تظهر في بيانات الإشغال والتقارير</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {supervisors.length > 0 && (
            <div className="space-y-2">
              {supervisors.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md">
                  <span className="text-sm font-medium">{i + 1}. {s}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => removeSupervisor(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {supervisors.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مسئولون مضافون</p>}
          <div className="flex gap-2 pt-1">
            <Input value={newSupervisor} onChange={e => setNewSupervisor(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSupervisor()}
              placeholder="د. اسم المسئول" className="h-9" />
            <Button size="sm" onClick={addSupervisor} disabled={!newSupervisor.trim() || loading} className="gap-1">
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Color */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> لون الواجهة</CardTitle>
          <CardDescription className="text-xs">اللون الرئيسي للنظام (يُطبق فور الحفظ وإعادة تحميل الصفحة)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            {["#2563eb","#16a34a","#dc2626","#7c3aed","#0891b2","#ea580c","#0f172a"].map(c => (
              <button key={c} onClick={() => setThemeColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }} title={c} />
            ))}
            <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border p-0.5" title="لون مخصص" />
            <Button variant="outline" size="sm" disabled={loading} onClick={() => saveSetting("theme_color", themeColor)}>
              <Save className="h-4 w-4 ml-1" /> حفظ اللون
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Login Password (main) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> كلمة مرور تسجيل الدخول الرئيسية</CardTitle>
          <CardDescription className="text-xs">كلمة المرور الرئيسية للنظام — تمنح صلاحيات المؤسس الكاملة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              placeholder="كلمة مرور جديدة..." dir="ltr" />
            <ConfirmDialog
              trigger={<Button variant="outline" disabled={!loginPassword || loading}>تغيير</Button>}
              title="تغيير كلمة المرور الرئيسية"
              description="هل أنت متأكد؟ احفظها في مكان آمن قبل التغيير."
              confirmLabel="تأكيد التغيير"
              variant="default"
              onConfirm={async () => { await saveSetting("login_password", loginPassword); setLoginPassword(""); }}
            />
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200">
            ⚠️ بعد التغيير، يجب استخدام الكلمة الجديدة في المرة القادمة.
          </p>
        </CardContent>
      </Card>

      {/* Named Passwords */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> كلمات مرور المستخدمين</CardTitle>
          <CardDescription className="text-xs">
            أضف كلمة مرور لكل موظف باسمه — سيُسجَّل اسمه في سجل العمليات عند كل دخول وتعديل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {namedPasswords.length > 0 && (
            <div className="space-y-2">
              {namedPasswords.map((np, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md">
                  <div>
                    <span className="font-medium text-sm">{np.name}</span>
                    <span className="text-xs text-muted-foreground mr-2">{'•'.repeat(Math.min(np.password.length, 8))}</span>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                    title={`حذف مستخدم "${np.name}"`}
                    description="سيُحذف وصول هذا المستخدم فوراً."
                    confirmLabel="حذف"
                    onConfirm={() => removeNamedPassword(i)}
                  />
                </div>
              ))}
            </div>
          )}
          {namedPasswords.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا توجد مستخدمون مضافون بعد</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">اسم المستخدم</Label>
              <Input value={newNpName} onChange={e => setNewNpName(e.target.value)} placeholder="د. أحمد محمد" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">كلمة المرور</Label>
              <div className="relative">
                <Input type={showNewNpPw ? "text" : "password"} value={newNpPassword}
                  onChange={e => setNewNpPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addNamedPassword()}
                  placeholder="كلمة المرور" className="h-9 pr-9" dir="ltr" />
                <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNewNpPw(s => !s)}>
                  {showNewNpPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={addNamedPassword} disabled={!newNpName.trim() || !newNpPassword.trim() || loading} className="gap-1 w-full">
            <Plus className="h-4 w-4" /> إضافة مستخدم
          </Button>
          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            💡 كل مستخدم يدخل بكلمة مروره الخاصة — ستجد اسمه في سجل العمليات مع كل إجراء.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/20 border-dashed">
        <CardContent className="pt-4 pb-4 text-center text-xs text-muted-foreground">
          نظام إدارة الحالات الطبية BSCH v1.0 | مستشفى الأطفال التخصصي بالبحيرة
        </CardContent>
      </Card>
    </div>
  );
}
