import { useState, useEffect, useRef } from "react";
import { useSettingsActions } from "@/contexts/settings-context";
import { Settings, Lock, Eye, EyeOff, Upload, Save, User, Plus, Trash2, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

const SETTINGS_PASSWORD = "@Bahnasy";

interface SettingsData {
  hospital_name?: string;
  logo_base64?: string;
  supervisors?: string;
  theme_color?: string;
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

  // Supervisors list
  const [supervisors, setSupervisors] = useState<string[]>([]);
  const [newSupervisor, setNewSupervisor] = useState("");

  useEffect(() => {
    apiGet<SettingsData>(`/api/settings?_=${Date.now()}`).then(data => {
      if (data.hospital_name) setHospitalName(data.hospital_name);
      if (data.logo_base64) setLogoPreview(data.logo_base64);
      if (data.theme_color) setThemeColor(data.theme_color);
      if (data.supervisors) {
        try { setSupervisors(JSON.parse(data.supervisors)); } catch { setSupervisors([]); }
      }
    }).catch(() => {});
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
    if (file.size > 800 * 1024) { toast.error("حجم الصورة كبير جداً (الحد 800 كيلوبايت)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      saveSetting("logo_base64", base64);
    };
    reader.readAsDataURL(file);
  };

  const saveSupervisors = (list: string[]) => {
    saveSetting("supervisors", JSON.stringify(list));
  };

  const addSupervisor = () => {
    if (!newSupervisor.trim()) return;
    const updated = [...supervisors, newSupervisor.trim()];
    setSupervisors(updated);
    setNewSupervisor("");
    saveSupervisors(updated);
  };

  const removeSupervisor = (i: number) => {
    const updated = supervisors.filter((_, idx) => idx !== i);
    setSupervisors(updated);
    saveSupervisors(updated);
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
            <Input
              value={hospitalName}
              onChange={e => setHospitalName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveSetting("hospital_name", hospitalName)}
              placeholder="اسم المستشفى"
            />
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
          <CardDescription className="text-xs">يظهر في الشريط الجانبي ورأس التقارير المطبوعة (الحد 800 كيلوبايت)</CardDescription>
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
          {supervisors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مسئولون مضافون</p>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={newSupervisor}
              onChange={e => setNewSupervisor(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSupervisor()}
              placeholder="د. اسم المسئول"
              className="h-9"
            />
            <Button size="sm" onClick={addSupervisor} disabled={!newSupervisor.trim() || loading} className="gap-1">
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Color */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" /> لون الواجهة
          </CardTitle>
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
            <Button variant="outline" size="sm" disabled={loading} onClick={async () => {
              await saveSetting("theme_color", themeColor);
              // Apply as CSS variable on the root
              document.documentElement.style.setProperty("--primary-hex", themeColor);
              toast.info("أعد تحميل الصفحة لتطبيق اللون بالكامل");
            }}>
              <Save className="h-4 w-4 ml-1" /> حفظ اللون
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> كلمة مرور تسجيل الدخول</CardTitle>
          <CardDescription className="text-xs">تغيير كلمة المرور الرئيسية للنظام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="كلمة مرور جديدة..."
              dir="ltr"
            />
            <ConfirmDialog
              trigger={<Button variant="outline" disabled={!loginPassword || loading}>تغيير</Button>}
              title="تغيير كلمة المرور"
              description="هل أنت متأكد من تغيير كلمة مرور تسجيل الدخول؟ احفظها في مكان آمن."
              confirmLabel="نعم، غيّر كلمة المرور"
              variant="default"
              onConfirm={async () => {
                await saveSetting("login_password", loginPassword);
                setLoginPassword("");
              }}
            />
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200">
            ⚠️ بعد تغيير كلمة المرور، ستحتاج لاستخدام الكلمة الجديدة في المرة القادمة.
          </p>
        </CardContent>
      </Card>

      {/* Settings password change */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> كلمة مرور الإعدادات</CardTitle>
          <CardDescription className="text-xs">تغيير كلمة مرور الدخول لهذه الصفحة</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            كلمة مرور الإعدادات الحالية: <code className="bg-muted px-1 rounded">@Bahnasy</code>
            <br />للتغيير تواصل مع مطور النظام.
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
