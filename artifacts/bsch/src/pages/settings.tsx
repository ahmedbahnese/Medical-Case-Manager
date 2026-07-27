import { useState, useEffect, useRef } from "react";
import { useSettingsActions } from "@/contexts/settings-context";
import {
  Settings, Lock, Eye, EyeOff, Upload, Save, User, Plus, Trash2,
  Palette, Building2, Edit2, X, Check
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  { value: "internal",              label: "الداخلي" },
  { value: "__custom__",            label: "نوع مخصص (حسب رغبة المؤسسة)..." },
];

const KNOWN_TYPE_VALUES = new Set(DEPT_TYPE_OPTIONS.map(o => o.value).filter(v => v !== "__custom__"));

/** Return the Select value: known type → its value, unknown/custom → "__custom__" */
function toSelectValue(type: string): string {
  return KNOWN_TYPE_VALUES.has(type) ? type : "__custom__";
}

/** Return human-readable label for display in the badge */
function deptTypeLabel(type: string): string {
  return DEPT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

const REPORT_FIELD_OPTIONS = [
  { key: "fileNumber",            label: "رقم الملف" },
  { key: "age",                   label: "السن" },
  { key: "diagnosis",             label: "التشخيص" },
  { key: "admissionDate",         label: "تاريخ الدخول" },
  { key: "stayDays",              label: "مدة الإقامة" },
  { key: "status",                label: "الحالة" },
  { key: "artificialRespiration", label: "التنفس الصناعي" },
  { key: "mobe",                  label: "MOBE" },
  { key: "parentName",            label: "ولي الأمر" },
  { key: "parentPhone",           label: "هاتف ولي الأمر" },
  { key: "nationalId",            label: "الرقم القومي" },
];
const ALL_REPORT_FIELD_KEYS = REPORT_FIELD_OPTIONS.map(f => f.key);

type ReportFieldEntry = string | { key: string; label: string; isCustom: true };
function parseReportFields(json: string | null | undefined): ReportFieldEntry[] {
  try { const p = JSON.parse(json ?? "[]"); return Array.isArray(p) && p.length > 0 ? p : [...ALL_REPORT_FIELD_KEYS]; }
  catch { return [...ALL_REPORT_FIELD_KEYS]; }
}
function rfKey(f: ReportFieldEntry) { return typeof f === "string" ? f : f.key; }
function rfIsCustom(f: ReportFieldEntry): f is { key: string; label: string; isCustom: true } {
  return typeof f !== "string" && (f as any).isCustom === true;
}

interface SettingsData {
  hospital_name?: string;
  logo_base64?: string;
  supervisors?: string;
  theme_color?: string;
  named_passwords?: string;
  watermark_enabled?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
  capacity: number;
  departmentType: string;
  description?: string;
  activeCasesCount?: number;
  reportFieldsJson?: string;
}

interface PagePermission {
  href: string;
  access: "none" | "view" | "edit";
}

interface NamedPassword {
  name: string;
  password: string;
  canEdit?: boolean;
  allowedPages?: string[];
  pagePermissions?: PagePermission[];
}

const ACCESS_LABELS: Record<string, string> = { none: "لا وصول", view: "عرض", edit: "تعديل" };
const ACCESS_ACTIVE_CLASS: Record<string, string> = {
  none: "bg-destructive/10 text-destructive border-destructive/40",
  view: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400",
  edit: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400",
};

const ALL_USER_PAGES = [
  { href: "/dashboard",             label: "لوحة التحكم" },
  { href: "/add-case",              label: "إضافة حالة" },
  { href: "/waiting-cases",         label: "قوائم الانتظار" },
  { href: "/artificial-respiration",label: "التنفس الصناعي" },
  { href: "/occupancy-report",      label: "بيان الإشغال" },
  { href: "/print-reports",         label: "التقرير اليومي" },
  { href: "/incident-report",       label: "بيانات الحوادث" },
  { href: "/advanced-search",       label: "بحث متقدم" },
  { href: "/discharge-history",     label: "سجل الخروج" },
  { href: "/bulk-import",           label: "الاستيراد الذكي" },
];

const DEFAULT_PAGE_PERMS: PagePermission[] = ALL_USER_PAGES.map(p => ({ href: p.href, access: "edit" as const }));

function migrateUserToPagePerms(np: NamedPassword): PagePermission[] {
  if (np.pagePermissions?.length) return np.pagePermissions;
  return ALL_USER_PAGES.map(p => ({
    href: p.href,
    access: (np.allowedPages?.length && !np.allowedPages.includes(p.href)
      ? "none"
      : np.canEdit !== false ? "edit" : "view") as "none" | "view" | "edit",
  }));
}

function setPageAccess(perms: PagePermission[], href: string, access: "none" | "view" | "edit"): PagePermission[] {
  const existing = perms.filter(p => p.href !== href);
  return [...existing, { href, access }];
}

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
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  // Supervisors
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [newSupervisor, setNewSupervisor] = useState("");

  // Named passwords
  const [namedPasswords, setNamedPasswords] = useState<NamedPassword[]>([]);
  const [newNpName, setNewNpName] = useState("");
  const [newNpPassword, setNewNpPassword] = useState("");
  const [showNewNpPw, setShowNewNpPw] = useState(false);
  const [newNpPagePerms, setNewNpPagePerms] = useState<PagePermission[]>([...DEFAULT_PAGE_PERMS]);
  // Edit existing user
  const [editingUserIdx, setEditingUserIdx] = useState<number | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserPw, setEditUserPw] = useState("");
  const [editUserPerms, setEditUserPerms] = useState<PagePermission[]>([]);
  const [showEditUserPw, setShowEditUserPw] = useState(false);

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [editingDept, setEditingDept] = useState<number | null>(null);
  const [editDeptData, setEditDeptData] = useState<Partial<Department>>({});
  const [newDept, setNewDept] = useState({ name: "", code: "", capacity: 10, departmentType: "intensive_care_high", description: "" });
  const [newDeptCustomType, setNewDeptCustomType] = useState("");
  const [editDeptCustomType, setEditDeptCustomType] = useState("");
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptFields, setNewDeptFields] = useState<ReportFieldEntry[]>([...ALL_REPORT_FIELD_KEYS]);
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [editCustomFieldLabel, setEditCustomFieldLabel] = useState("");
  const [showNewDeptFields, setShowNewDeptFields] = useState(false);

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
      if (data.watermark_enabled !== undefined) setWatermarkEnabled(data.watermark_enabled !== "false");
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
    const newUser: NamedPassword = {
      name: newNpName.trim(),
      password: newNpPassword.trim(),
      pagePermissions: newNpPagePerms,
    };
    const updated = [...namedPasswords, newUser];
    setNamedPasswords(updated);
    setNewNpName(""); setNewNpPassword(""); setNewNpPagePerms([...DEFAULT_PAGE_PERMS]);
    saveNamedPasswords(updated);
  };
  const removeNamedPassword = (i: number) => {
    const updated = namedPasswords.filter((_, idx) => idx !== i);
    setNamedPasswords(updated); saveNamedPasswords(updated);
  };
  const startEditUser = (i: number) => {
    const np = namedPasswords[i];
    setEditingUserIdx(i);
    setEditUserName(np.name);
    setEditUserPw("");
    setEditUserPerms(migrateUserToPagePerms(np));
    setShowEditUserPw(false);
  };
  const cancelEditUser = () => { setEditingUserIdx(null); setEditUserName(""); setEditUserPw(""); setEditUserPerms([]); };
  const saveEditUser = (i: number) => {
    if (!editUserName.trim()) { toast.error("اسم المستخدم مطلوب"); return; }
    const list = [...namedPasswords];
    list[i] = {
      name: editUserName.trim(),
      password: editUserPw.trim() || list[i].password,
      pagePermissions: editUserPerms,
    };
    setNamedPasswords(list);
    saveNamedPasswords(list);
    cancelEditUser();
  };

  /* ─── Departments ─── */
  const resolvedNewDeptType = newDept.departmentType === "__custom__" ? newDeptCustomType.trim() : newDept.departmentType;

  const handleAddDept = async () => {
    if (!newDept.name.trim() || !newDept.code.trim()) { toast.error("الاسم والكود مطلوبان"); return; }
    if (!resolvedNewDeptType) { toast.error("يرجى تحديد نوع القسم"); return; }
    setDeptLoading(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newDept, departmentType: resolvedNewDeptType, reportFieldsJson: JSON.stringify(newDeptFields) }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("تم إضافة القسم");
      setNewDept({ name: "", code: "", capacity: 10, departmentType: "intensive_care_high", description: "" });
      setNewDeptCustomType("");
      setNewDeptFields([...ALL_REPORT_FIELD_KEYS]);
      setNewCustomFieldLabel("");
      setShowAddDept(false);
      setShowNewDeptFields(false);
      loadDepartments();
    } catch (e: any) { toast.error("خطأ: " + e.message); }
    finally { setDeptLoading(false); }
  };

  const handleSaveDept = async (id: number, dept: Department) => {
    setDeptLoading(true);
    // Resolve custom type if needed
    const resolvedEditType = editDeptData.departmentType === "__custom__"
      ? editDeptCustomType.trim()
      : editDeptData.departmentType;
    const payload = { ...editDeptData };
    if (resolvedEditType !== undefined) payload.departmentType = resolvedEditType;
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      {/* Report watermark */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">العلامة المائية للتقارير</CardTitle>
          <CardDescription className="text-xs">
            استخدم الشعار المرفوع خلف التقارير والسجلات بشكل خفيف ورسمي. يمكنك تغيير الشعار من القسم السابق.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Checkbox
              id="watermark-enabled"
              checked={watermarkEnabled}
              onCheckedChange={(checked) => setWatermarkEnabled(!!checked)}
            />
            <Label htmlFor="watermark-enabled" className="cursor-pointer">
              إظهار الشعار كعلامة مائية في التقارير والطباعة
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => saveSetting("watermark_enabled", String(watermarkEnabled))}
          >
            <Save className="h-4 w-4 ml-1" /> حفظ الإعداد
          </Button>
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
                  {newDept.departmentType === "__custom__" && (
                    <Input
                      value={newDeptCustomType}
                      onChange={e => setNewDeptCustomType(e.target.value)}
                      placeholder="اكتب نوع القسم مثال: جراحة، باطنة..."
                      className="h-8 text-sm mt-1"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الطاقة الاستيعابية</Label>
                  <Input type="number" min={1} max={100} value={newDept.capacity}
                    onChange={e => setNewDept(p => ({ ...p, capacity: parseInt(e.target.value) || 10 }))}
                    className="h-8 text-sm" />
                </div>
              </div>
              {/* Report fields config */}
              <div className="col-span-2 space-y-2">
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2"
                  onClick={() => setShowNewDeptFields(s => !s)}
                >
                  {showNewDeptFields ? "إخفاء" : "تخصيص"} حقول البيان ({newDeptFields.length} حقل)
                </button>
                {showNewDeptFields && (
                  <div className="space-y-2 p-2 border rounded-lg bg-background">
                    {/* Standard fields */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {REPORT_FIELD_OPTIONS.map(opt => (
                        <div key={opt.key} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`nf-${opt.key}`}
                            checked={newDeptFields.some(f => rfKey(f) === opt.key)}
                            onCheckedChange={v => setNewDeptFields(prev =>
                              v ? [...prev, opt.key] : prev.filter(f => rfKey(f) !== opt.key)
                            )}
                          />
                          <Label htmlFor={`nf-${opt.key}`} className="text-xs cursor-pointer">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                    {/* Custom fields */}
                    {newDeptFields.filter(rfIsCustom).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                        {newDeptFields.filter(rfIsCustom).map(f => (
                          <span key={f.key} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            {f.label}
                            <button type="button" onClick={() => setNewDeptFields(prev => prev.filter(x => rfKey(x) !== f.key))} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add custom field */}
                    <div className="flex gap-1.5 pt-1 border-t">
                      <Input
                        value={newCustomFieldLabel}
                        onChange={e => setNewCustomFieldLabel(e.target.value)}
                        placeholder="اسم حقل مخصص (مثال: فصيلة الدم)"
                        className="h-7 text-xs flex-1"
                        onKeyDown={e => {
                          if (e.key === "Enter" && newCustomFieldLabel.trim()) {
                            e.preventDefault();
                            const key = `custom_${Date.now()}`;
                            setNewDeptFields(prev => [...prev, { key, label: newCustomFieldLabel.trim(), isCustom: true as const }]);
                            setNewCustomFieldLabel("");
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2"
                        onClick={() => {
                          if (!newCustomFieldLabel.trim()) return;
                          const key = `custom_${Date.now()}`;
                          setNewDeptFields(prev => [...prev, { key, label: newCustomFieldLabel.trim(), isCustom: true as const }]);
                          setNewCustomFieldLabel("");
                        }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowAddDept(false); setShowNewDeptFields(false); }}>إلغاء</Button>
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
                          <Select
                            value={toSelectValue(editDeptData.departmentType ?? dept.departmentType)}
                            onValueChange={v => {
                              setEditDeptData(p => ({ ...p, departmentType: v }));
                              if (v !== "__custom__") setEditDeptCustomType("");
                            }}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DEPT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {(editDeptData.departmentType === "__custom__") && (
                            <Input
                              value={editDeptCustomType}
                              onChange={e => setEditDeptCustomType(e.target.value)}
                              placeholder="اكتب نوع القسم مثال: جراحة، باطنة..."
                              className="h-8 text-sm mt-1"
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الطاقة الاستيعابية</Label>
                          <Input type="number" min={1} max={200}
                            value={editDeptData.capacity ?? dept.capacity}
                            onChange={e => setEditDeptData(p => ({ ...p, capacity: parseInt(e.target.value) || dept.capacity }))}
                            className="h-8 text-sm" />
                        </div>
                      </div>
                      {/* Report fields config for edit */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">حقول البيان — اختر ما يظهر في بيان هذا القسم:</p>
                        <div className="grid grid-cols-3 gap-1.5 p-2 border rounded-lg bg-muted/20">
                          {REPORT_FIELD_OPTIONS.map(opt => {
                            const currentJson = editDeptData.reportFieldsJson ?? dept.reportFieldsJson ?? "[]";
                            let currentFields: string[];
                            try { const p = JSON.parse(currentJson); currentFields = Array.isArray(p) && p.length > 0 ? p : ALL_REPORT_FIELD_KEYS; }
                            catch { currentFields = ALL_REPORT_FIELD_KEYS; }
                            return (
                              <div key={opt.key} className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`ef-${dept.id}-${opt.key}`}
                                  checked={currentFields.includes(opt.key)}
                                  onCheckedChange={v => {
                                    const updated = v
                                      ? [...currentFields, opt.key]
                                      : currentFields.filter(k => k !== opt.key);
                                    setEditDeptData(p => ({ ...p, reportFieldsJson: JSON.stringify(updated) }));
                                  }}
                                />
                                <Label htmlFor={`ef-${dept.id}-${opt.key}`} className="text-xs cursor-pointer">{opt.label}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDept(null); setEditDeptData({}); }}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleSaveDept(dept.id, dept)} disabled={deptLoading} className="gap-1">
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
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {deptTypeLabel(dept.departmentType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            طاقة: {dept.capacity} | مشغول: {dept.activeCasesCount ?? 0}
                          </span>
                          {(() => {
                            try { const f = JSON.parse(dept.reportFieldsJson ?? "[]"); return Array.isArray(f) && f.length > 0 && f.length < ALL_REPORT_FIELD_KEYS.length ? <span className="text-[10px] text-muted-foreground">({f.length} حقل في البيان)</span> : null; }
                            catch { return null; }
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingDept(dept.id);
                            setEditDeptData({ reportFieldsJson: dept.reportFieldsJson ?? "[]" });
                            // Pre-fill custom type input if dept has a non-standard type
                            if (!KNOWN_TYPE_VALUES.has(dept.departmentType)) {
                              setEditDeptCustomType(dept.departmentType);
                              setEditDeptData({ reportFieldsJson: dept.reportFieldsJson ?? "[]", departmentType: "__custom__" });
                            } else {
                              setEditDeptCustomType("");
                            }
                          }}>
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
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> كلمات مرور المستخدمين والصلاحيات</CardTitle>
          <CardDescription className="text-xs">
            أضف مستخدمين وحدد صلاحية كل صفحة — تعديل / عرض / لا وصول — الإعدادات وسجل العمليات والنسخ الاحتياطي للمؤسس فقط
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {namedPasswords.length > 0 && (
            <div className="space-y-2">
              {namedPasswords.map((np, i) => (
                <div key={i} className="border rounded-lg bg-muted/20">
                  {editingUserIdx === i ? (
                    /* ── Inline edit form ── */
                    <div className="p-3 space-y-3">
                      <p className="text-xs font-semibold text-primary">تعديل: {np.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">الاسم</Label>
                          <Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">كلمة المرور الجديدة <span className="text-muted-foreground">(فارغ = إبقاء)</span></Label>
                          <div className="relative">
                            <Input type={showEditUserPw ? "text" : "password"} value={editUserPw}
                              onChange={e => setEditUserPw(e.target.value)}
                              placeholder="اتركه فارغاً للإبقاء" className="h-9 pr-9" dir="ltr" />
                            <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowEditUserPw(s => !s)}>
                              {showEditUserPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">صلاحيات كل صفحة</Label>
                          <div className="flex gap-2">
                            <button type="button" className="text-[10px] text-emerald-600 hover:underline"
                              onClick={() => setEditUserPerms(ALL_USER_PAGES.map(p => ({ href: p.href, access: "edit" as const })))}>تعديل للكل</button>
                            <button type="button" className="text-[10px] text-amber-600 hover:underline"
                              onClick={() => setEditUserPerms(ALL_USER_PAGES.map(p => ({ href: p.href, access: "view" as const })))}>عرض للكل</button>
                            <button type="button" className="text-[10px] text-destructive hover:underline"
                              onClick={() => setEditUserPerms(ALL_USER_PAGES.map(p => ({ href: p.href, access: "none" as const })))}>إخفاء الكل</button>
                          </div>
                        </div>
                        <div className="border rounded-md divide-y text-xs">
                          {ALL_USER_PAGES.map(page => {
                            const access = editUserPerms.find(p => p.href === page.href)?.access ?? "edit";
                            return (
                              <div key={page.href} className="flex items-center justify-between px-3 py-1.5">
                                <span>{page.label}</span>
                                <div className="flex gap-1">
                                  {(["none", "view", "edit"] as const).map(level => (
                                    <button key={level} type="button"
                                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${access === level ? ACCESS_ACTIVE_CLASS[level] : "border-border text-muted-foreground hover:border-primary/40"}`}
                                      onClick={() => setEditUserPerms(p => setPageAccess(p, page.href, level))}>
                                      {ACCESS_LABELS[level]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button variant="ghost" size="sm" onClick={cancelEditUser}><X className="h-4 w-4 ml-1" /> إلغاء</Button>
                        <Button size="sm" onClick={() => saveEditUser(i)} disabled={loading}><Check className="h-4 w-4 ml-1" /> حفظ</Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-medium text-sm">{np.name}</span>
                        <span className="text-xs text-muted-foreground">{'•'.repeat(Math.min(np.password?.length ?? 0, 8))}</span>
                        {(() => {
                          const perms = migrateUserToPagePerms(np);
                          const ec = perms.filter(p => p.access === "edit").length;
                          const vc = perms.filter(p => p.access === "view").length;
                          const nc = perms.filter(p => p.access === "none").length;
                          return (<>
                            {ec > 0 && <Badge variant="default" className="text-[10px] h-4 px-1.5">{ec} تعديل</Badge>}
                            {vc > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">{vc} عرض</Badge>}
                            {nc > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{nc} مخفي</Badge>}
                          </>);
                        })()}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditUser(i)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDialog
                          trigger={<Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>}
                          title={`حذف مستخدم "${np.name}"`}
                          description="سيُحذف وصول هذا المستخدم فوراً."
                          confirmLabel="حذف"
                          onConfirm={() => removeNamedPassword(i)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {namedPasswords.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا توجد مستخدمون مضافون بعد</p>}

          {/* Add new user form */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
            <p className="text-xs font-semibold text-muted-foreground">إضافة مستخدم جديد</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">اسم المستخدم</Label>
                <Input value={newNpName} onChange={e => setNewNpName(e.target.value)} placeholder="د. أحمد محمد" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">كلمة المرور</Label>
                <div className="relative">
                  <Input type={showNewNpPw ? "text" : "password"} value={newNpPassword}
                    onChange={e => setNewNpPassword(e.target.value)}
                    placeholder="كلمة المرور" className="h-9 pr-9" dir="ltr" />
                  <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowNewNpPw(s => !s)}>
                    {showNewNpPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">صلاحيات كل صفحة</Label>
                <div className="flex gap-2">
                  <button type="button" className="text-[10px] text-emerald-600 hover:underline"
                    onClick={() => setNewNpPagePerms(ALL_USER_PAGES.map(p => ({ href: p.href, access: "edit" as const })))}>تعديل للكل</button>
                  <button type="button" className="text-[10px] text-amber-600 hover:underline"
                    onClick={() => setNewNpPagePerms(ALL_USER_PAGES.map(p => ({ href: p.href, access: "view" as const })))}>عرض للكل</button>
                  <button type="button" className="text-[10px] text-destructive hover:underline"
                    onClick={() => setNewNpPagePerms(ALL_USER_PAGES.map(p => ({ href: p.href, access: "none" as const })))}>إخفاء الكل</button>
                </div>
              </div>
              <div className="border rounded-md divide-y text-xs">
                {ALL_USER_PAGES.map(page => {
                  const access = newNpPagePerms.find(p => p.href === page.href)?.access ?? "edit";
                  return (
                    <div key={page.href} className="flex items-center justify-between px-3 py-1.5">
                      <span>{page.label}</span>
                      <div className="flex gap-1">
                        {(["none", "view", "edit"] as const).map(level => (
                          <button key={level} type="button"
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${access === level ? ACCESS_ACTIVE_CLASS[level] : "border-border text-muted-foreground hover:border-primary/40"}`}
                            onClick={() => setNewNpPagePerms(p => setPageAccess(p, page.href, level))}>
                            {ACCESS_LABELS[level]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Button size="sm" onClick={addNamedPassword} disabled={!newNpName.trim() || !newNpPassword.trim() || loading} className="gap-1 w-full">
              <Plus className="h-4 w-4" /> إضافة مستخدم
            </Button>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            💡 كل مستخدم يدخل بكلمة مروره — الصفحات المخفية لا تظهر في القائمة، وصفحات "عرض" تُعرض بدون أزرار تعديل.
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
