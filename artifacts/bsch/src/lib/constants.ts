export const LABELS = {
  DEPARTMENT_TYPES: {
    intensive_care_high: "العناية المركزة الكبرى",
    intensive_care_medium: "العناية المركزة المتوسطة",
    picu: "عناية مركزة أطفال (PICU)",
    incubator_a: "حضانات أ",
    incubator_b: "حضانات ب",
    incubator_c: "حضانات ج",
  },
  ARTIFICIAL_RESPIRATION: {
    high_frequency: "تردد عالي (HFO)",
    vent: "فنت (VENT)",
    cpap: "سباب (CPAP)",
    hfnc: "HFNC",
    standby: "استاندباي",
    box: "بوكس / نيزل كانيولا",
    no: "هواء الغرفة",
  },
  STATUS: {
    active: "نشط",
    recovering: "تعافي",
    discharged: "خروج",
    critical: "حرج",
  },
  WAITING_SECTION: {
    servo: "سيرفو",
    reception: "استقبال",
  },
  WAITING_STATUS: {
    waiting: "في الانتظار",
    admitted: "تم الدخول",
    cancelled: "ملغي / محول",
  },
  DISCHARGE_REASON: {
    improved: "تحسن",
    request: "بناءً على الطلب",
    transferred: "تحويل لمستشفى أخرى",
    death: "وفاة",
  },
  CARE_TYPES: {
    intensive_care_high: "العناية المركزة الكبرى",
    intensive_care_medium: "العناية المركزة المتوسطة",
    picu: "عناية مركزة أطفال (PICU)",
    incubator: "حضانة",
  },
};

// Types that use محضن instead of سرير
export const INCUBATOR_TYPES = new Set([
  "incubator_a",
  "incubator_b",
  "incubator_c",
  "picu",
  "incubator",
]);

export function getBedType(departmentType: string): "محضن" | "سرير" {
  return INCUBATOR_TYPES.has(departmentType) ? "محضن" : "سرير";
}

// Mapping from departmentType → caseType (for add-case form)
export function deptTypeToCaseType(departmentType: string): string {
  if (departmentType.startsWith("incubator")) return "incubator";
  return departmentType;
}

export function translate(key: string, dict: Record<string, string>): string {
  return dict[key] || key;
}

export function calcStayDays(admissionDate: string | Date | null | undefined): number {
  if (!admissionDate) return 0;
  const from = new Date(admissionDate);
  const now = new Date();
  return Math.floor((now.getTime() - from.getTime()) / 86400000);
}

export function calcStayLabel(admissionDate: string | Date | null | undefined): string {
  const days = calcStayDays(admissionDate);
  if (days === 0) return "اليوم";
  return `${days} يوم`;
}

export function formatDateAr(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTimeAr(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
