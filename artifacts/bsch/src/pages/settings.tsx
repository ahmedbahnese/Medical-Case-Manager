import { useState, useEffect, useRef } from "react";
import { Settings, Lock, Eye, EyeOff, Upload, Sun, Moon, Save, Trash2, Plus, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

const SETTINGS_PASSWORD = "@Bahnasy";

interface SettingsData {
  hospital_name?: string;
  logo_base64?: string;
  theme?: string;
  login_password?: string;
}

export default function SettingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [hospitalName, setHospitalName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    // Load public settings (no password needed)
    apiGet<SettingsData>("/api/settings").then(data => {
      setSettings(data);
      setHospitalName(data.hospital_name ?? "مستشفى الأطفال التخصصي بالبحيرة");
      setDarkMode(data.theme === "dark");
      setLogoPreview(data.logo_base64 ?? null);
      // Apply theme
      document.documentElement.classList.toggle("dark", data.theme === "dark");
    }).catch(() => {});
  }, []);

  const handleUnlock = async () => {
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
      toast.success("تم الحفظ");
    } catch (e: any) {
      toast.error("فشل الحفظ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("حجم الصورة كبير جداً (الحد الأقصى 500 كيلوبايت)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      saveSetting("logo_base64", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleThemeToggle = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    saveSetting("theme", checked ? "dark" : "light");
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto space-y-6 mt-12">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-xl">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الإعدادات</h1>
            <p className="text-muted-foreground text-sm">يتطلب كلمة مرور خاصة</p>
          </div>
        </div>

        <Card className="border-primary/20 shadow-md">
          <CardHeader className="text-center">
            <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>تسجيل دخول الإعدادات</CardTitle>
            <CardDescription>أدخل كلمة مرور الإعدادات للمتابعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>كلمة مرور الإعدادات</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pwInput}
                  onChange={e => setPwInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUnlock()}
                  placeholder="••••••••"
                  dir="ltr"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute left-3 top-2.5 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={handleUnlock}>
              <Lock className="h-4 w-4 ml-2" /> دخول الإعدادات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-3 rounded-xl">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground text-sm">إعدادات النظام والمستشفى</p>
        </div>
      </div>

      {/* Hospital Identity */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">هوية المستشفى</CardTitle>
          <CardDescription className="text-xs">اسم المستشفى والشعار يظهران في التقارير المطبوعة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>اسم المستشفى</Label>
            <div className="flex gap-2">
              <Input
                value={hospitalName}
                onChange={e => setHospitalName(e.target.value)}
                placeholder="اسم المستشفى..."
              />
              <Button variant="outline" onClick={() => saveSetting("hospital_name", hospitalName)} disabled={loading}>
                <Save className="h-4 w-4 ml-1" /> حفظ
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>شعار المستشفى (لوجو)</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="لوجو" className="h-20 w-20 object-contain border rounded-lg" />
                  <ConfirmDialog
                    trigger={
                      <button className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    }
                    title="حذف الشعار"
                    description="هل تريد حذف الشعار الحالي؟"
                    confirmLabel="نعم، احذف"
                    onConfirm={() => {
                      setLogoPreview(null);
                      saveSetting("logo_base64", "");
                    }}
                  />
                </div>
              ) : (
                <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                  <Upload className="h-8 w-8" />
                </div>
              )}
              <div>
                <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> {logoPreview ? "تغيير الشعار" : "رفع الشعار"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG أو JPG — الحد الأقصى 500 كيلوبايت</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">المظهر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-yellow-500" />}
              <div>
                <p className="font-medium text-sm">{darkMode ? "الوضع الداكن" : "الوضع الفاتح"}</p>
                <p className="text-xs text-muted-foreground">تبديل المظهر</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleThemeToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">الأمان وكلمات المرور</CardTitle>
          <CardDescription className="text-xs">تغيير كلمة المرور الرئيسية لتسجيل الدخول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>كلمة المرور الجديدة لتسجيل الدخول</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="كلمة مرور جديدة..."
                dir="ltr"
              />
              <ConfirmDialog
                trigger={
                  <Button variant="outline" disabled={!loginPassword}>
                    <Save className="h-4 w-4 ml-1" /> تغيير
                  </Button>
                }
                title="تغيير كلمة المرور"
                description="هل أنت متأكد من تغيير كلمة مرور تسجيل الدخول؟ تأكد من حفظها في مكان آمن."
                confirmLabel="نعم، غير كلمة المرور"
                variant="default"
                onConfirm={() => {
                  saveSetting("login_password", loginPassword);
                  setLoginPassword("");
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">⚠️ ملاحظة: تغيير كلمة المرور سيؤثر على المتغير البيئي FOUNDER_PASSWORD</p>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="shadow-sm bg-muted/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground text-center">
            نظام إدارة الحالات الطبية — BSCH v1.0 | مستشفى الأطفال التخصصي بالبحيرة
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
