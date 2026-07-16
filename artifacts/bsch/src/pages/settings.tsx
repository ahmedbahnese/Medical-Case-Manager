import { useState, useEffect, useRef } from "react";
import { Settings, Lock, Eye, EyeOff, Upload, Save, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

const SETTINGS_PASSWORD = "@Bahnasy";

interface SettingsData {
  hospital_name?: string;
  logo_base64?: string;
  login_password?: string;
}

export default function SettingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [hospitalName, setHospitalName] = useState("مستشفى الأطفال التخصصي بالبحيرة");
  const [loginPassword, setLoginPassword] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SettingsData>("/api/settings").then(data => {
      if (data.hospital_name) setHospitalName(data.hospital_name);
      if (data.logo_base64) setLogoPreview(data.logo_base64);
    }).catch(() => {});
  }, []);

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
    if (file.size > 500 * 1024) { toast.error("حجم الصورة كبير جداً (الحد 500 كيلوبايت)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      saveSetting("logo_base64", base64);
    };
    reader.readAsDataURL(file);
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
          <CardDescription className="text-xs">يظهر في التقارير والطباعة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={hospitalName}
              onChange={e => setHospitalName(e.target.value)}
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
          <CardDescription className="text-xs">يظهر في رأس التقارير المطبوعة (الحد 500 كيلوبايت)</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-20 w-20 object-contain border rounded-lg p-1" />
          ) : (
            <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
              <Upload className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> رفع شعار
            </Button>
            {logoPreview && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={() => { setLogoPreview(null); saveSetting("logo_base64", ""); }}>
                حذف الشعار
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> كلمة مرور تسجيل الدخول</CardTitle>
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
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            ⚠️ بعد تغيير كلمة المرور، ستحتاج لاستخدام الكلمة الجديدة في المرة القادمة.
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
