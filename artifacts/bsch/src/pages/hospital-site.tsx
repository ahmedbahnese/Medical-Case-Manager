import { useState } from "react";
import { ArrowLeft, Clock3, MapPin, Phone, ShieldCheck, Stethoscope, X } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const services = [
  { title: "وحدة الحضانات", icon: "🍼", items: ["وحدة عناية مركزة للأطفال الخُدَّج", "أجهزة تنفس اصطناعي متطورة", "متابعة طبية لصيقة 24/7", "دعم نفسي واجتماعي للأسرة"] },
  { title: "الطوارئ والاستقبال", icon: "🚑", items: ["استقبال طارئ فوري على مدار 24 ساعة", "أجهزة إنعاش وإسعافات متطورة", "فريق طبي وتمريضي متخصص", "رعاية مركزة للحالات الحرجة"] },
  { title: "العيادات التخصصية", icon: "🩺", items: ["نخبة من الأطباء الاستشاريين", "عيادات تخصصية متكاملة للأطفال", "جدول مواعيد وأجندة أسبوعية دقيقة", "عيادات يومية متخصصة"] },
  { title: "الأشعة والتصوير الطبي", icon: "🔬", items: ["خدمات الأشعة السينية", "موجات فوق صوتية دقيقة", "نتائج سريعة وموثوقة", "طاقم طبي متخصص"] },
  { title: "التحاليل الطبية", icon: "🧪", items: ["أحدث أجهزة التحاليل الطبية للأطفال", "فحوصات شاملة ودقيقة على مدار الساعة", "إشراف كيميائي وطبي متخصص", "سرعة تسليم النتائج بدقة فائقة"] },
  { title: "العمليات والجراحة", icon: "🏥", items: ["غرف عمليات معقمة ومتطورة", "أحدث أجهزة التخدير والمتابعة الجراحية", "طاقم جراحي واستشاري متخصص للأطفال", "رعاية وإفاقة متكاملة لما بعد الجراحة"] },
  { title: "بنك الدم", icon: "🩸", items: ["توفير فصائل ومشتقات الدم الآمنة", "أحدث ثلاجات وأجهزة التبريد والحفظ", "فحوصات توافق ومطابقة دقيقة وسريعة", "جاهزية تامة لطوارئ الأطفال 24/7"] },
  { title: "الصيدلة الإكلينيكية", icon: "💊", items: ["حساب وضبط الجرعات الدوائية للأطفال", "إشراف دوائي مباشر للحضانات والرعايات", "متابعة التفاعلات والبروتوكولات العلاجية", "طاقم صيادلة إكلينيكيين مؤهل ومتخصص"] },
  { title: "العناية المركزة والتنفس الصناعي", icon: "🫁", items: ["أحدث أجهزة التنفس الصناعي والمراقبة الحيوية", "رعاية حرجة ومتواصلة للأطفال 24 ساعة", "إشراف نخبة من استشاريي طب الحالات الحرجة", "فريق تمريض متخصص ومدرب للرعاية الفائقة"] },
];

const doctors = [
  "د. سمر محمد عاطف — استشاري طب وكلى الأطفال",
  "د. محمد النجار — رئيس قسم مناظير الأنف والأذن والحنجرة",
  "د. كريم ماضي — استشاري ومدرس جراحة القلب والصدر",
  "د. جهاد فيصل الزناتي — رئيسة الأقسام الطبية ودكتوراه طب الأطفال",
];

const gallery = ["/hospital-site/building.jpg", "/hospital-site/photo-1.jpeg", "/hospital-site/photo-2.jpeg", "/hospital-site/photo-3.jpeg"];

export default function HospitalSite() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  return <div className="space-y-8 pb-12" dir="rtl">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
      <img src="/hospital-site/building.jpg" alt="مبنى المستشفى" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="relative z-10 grid gap-8 p-7 md:grid-cols-[1fr_auto] md:p-12">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-4"><img src="/hospital-site/logo.png" alt="شعار المستشفى" className="h-20 w-20 rounded-2xl bg-white p-2 object-contain" /><div><Badge className="mb-2 bg-emerald-500/90">خدمة داخلية بدون إنترنت</Badge><p className="text-sm text-white/75">مستشفى معتمد — محافظة البحيرة</p></div></div>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">مستشفى الأطفال التخصصي بالبحيرة</h1>
          <p className="max-w-2xl text-base leading-8 text-white/85 md:text-lg">نقدم أعلى مستويات الرعاية الطبية المتخصصة للأطفال في محافظة البحيرة، بفريق استشاري متمرس وتجهيزات طبية حديثة وخدمة طوارئ متاحة على مدار الساعة.</p>
          <div className="flex flex-wrap gap-3"><Button asChild className="gap-2"><Link href="/outpatient-clinics">حجز العيادات الخارجية <ArrowLeft className="h-4 w-4" /></Link></Button><Button variant="secondary" className="gap-2" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>استعراض الخدمات</Button></div>
        </div>
        <div className="grid grid-cols-2 gap-3 self-end text-center md:w-72"><div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><b className="block text-2xl">24/7</b><span className="text-xs text-white/75">طوارئ واستقبال</span></div><div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><b className="block text-2xl">PICU</b><span className="text-xs text-white/75">رعاية مركزة للأطفال</span></div><div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><b className="block text-2xl">NICU</b><span className="text-xs text-white/75">رعاية المبتسرين</span></div><div className="rounded-2xl bg-white/10 p-4 backdrop-blur"><b className="block text-2xl">9+</b><span className="text-xs text-white/75">خدمات تخصصية</span></div></div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-4"><Stat title="حضانة NICU" text="مجهزة بأحدث أجهزة التنفس للمبتسرين" /><Stat title="سرير PICU" text="رعاية فائقة للمؤشرات الحيوية 24/7" /><Stat title="إقامة داخلية" text="غرف فردية ومزدوجة مجهزة" /><Stat title="طوارئ واستقبال" text="تجهيزات الإنعاش الفوري للأطفال" /></section>

    <section id="services" className="space-y-4"><SectionHeading title="أقسامنا وخدماتنا" description="تغطية شاملة لاحتياجات طفلك الصحية تحت سقف واحد." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map(service => <Card key={service.title} className="border-slate-200/80 transition hover:-translate-y-1 hover:shadow-lg"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-3 text-lg"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-2xl">{service.icon}</span>{service.title}</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm leading-6 text-muted-foreground">{service.items.map(item => <li key={item} className="flex gap-2"><span className="text-primary">✓</span>{item}</li>)}</ul></CardContent></Card>)}</div></section>

    <section className="grid gap-6 lg:grid-cols-2"><Card className="overflow-hidden"><img src="/hospital-site/photo-1.jpeg" alt="من تجهيزات المستشفى" className="h-64 w-full object-cover" /><CardContent className="space-y-3 p-6"><h2 className="text-2xl font-bold">ثقة الآباء</h2><p className="leading-8 text-muted-foreground">نجمع بين الخبرة الطبية والتكنولوجيا الحديثة، مع نهج الفريق الطبي المتكامل ووضع أفضل خطة علاجية مخصصة لكل طفل.</p><div className="grid gap-3 text-sm"><div className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" />فريق متخصص جاهز على مدار الساعة.</div><div className="flex gap-2"><Stethoscope className="h-5 w-5 shrink-0 text-primary" />أحدث أجهزة التصوير والتشخيص والجراحة.</div></div></CardContent></Card><Card className="overflow-hidden"><img src="/hospital-site/photo-2.jpeg" alt="من مرافق المستشفى" className="h-64 w-full object-cover" /><CardContent className="space-y-3 p-6"><h2 className="text-2xl font-bold">رعاية متكاملة</h2><p className="leading-8 text-muted-foreground">بيئة مصممة للأطفال، وطواقم تمريضية مدربة، ومتابعة بعد الخروج عبر بوابة الأسرة ومواعيد المتابعة.</p><div className="flex flex-wrap gap-2"><Badge variant="outline">رعاية أطفال</Badge><Badge variant="outline">طوارئ 24 ساعة</Badge><Badge variant="outline">متابعة الأسرة</Badge></div></CardContent></Card></section>

    <section className="space-y-4"><SectionHeading title="الكوادر الطبية" description="فريق من أمهر أطباء الأطفال المتخصصين بخبرات واسعة." /><div className="grid gap-3 md:grid-cols-2">{doctors.map(doctor => <div key={doctor} className="flex items-center gap-3 rounded-2xl border bg-card p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10"><Stethoscope className="h-5 w-5 text-primary" /></div><span className="text-sm font-medium leading-6">{doctor}</span></div>)}</div></section>

    <section className="space-y-4"><SectionHeading title="معرض المستشفى" description="نسخة محلية من الصور التعريفية للموقع الأصلي، تعمل داخل السيرفر الداخلي." /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{gallery.map(src => <button key={src} type="button" onClick={() => setLightbox(src)} className="group overflow-hidden rounded-2xl border bg-muted"><img src={src} alt="صورة من المستشفى" className="h-44 w-full object-cover transition duration-300 group-hover:scale-105" /></button>)}</div></section>

    <section className="rounded-3xl bg-primary/5 p-6 md:p-8"><div className="grid gap-5 md:grid-cols-3"><div className="flex gap-3"><MapPin className="h-6 w-6 shrink-0 text-primary" /><div><b>العنوان</b><p className="mt-1 text-sm text-muted-foreground">قرية دمسنا، مركز أبو حمص، البحيرة، مصر</p></div></div><div className="flex gap-3"><Phone className="h-6 w-6 shrink-0 text-primary" /><div><b>التواصل</b><p className="mt-1 text-sm text-muted-foreground" dir="ltr">01099464375</p></div></div><div className="flex gap-3"><Clock3 className="h-6 w-6 shrink-0 text-primary" /><div><b>الطوارئ</b><p className="mt-1 text-sm text-muted-foreground">متاحة على مدار 24 ساعة</p></div></div></div></section>

    {lightbox && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5" onClick={() => setLightbox(null)}><button type="button" className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white" onClick={() => setLightbox(null)}><X /></button><img src={lightbox} alt="معاينة صورة المستشفى" className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain" /></div>}
  </div>;
}

function SectionHeading({ title, description }: { title: string; description: string }) { return <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function Stat({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border bg-card p-5"><b className="text-lg text-primary">{title}</b><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
