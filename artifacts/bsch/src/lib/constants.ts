export const LABELS = {
  DEPARTMENT_TYPES: {
    intensive_care_high: "عناية كبيرة",
    intensive_care_medium: "عناية متوسطة",
    picu: "بيكيو (PICU)",
    incubator_a: "حضانة أ",
    incubator_b: "حضانة ب",
    incubator_c: "حضانة ج",
  },
  ARTIFICIAL_RESPIRATION: {
    high_frequency: "تردد عالي (HFO)",
    vent: "فنت (VENT)",
    cpap: "CPAP / HFNC",
    standby: "O₂ / Mask",
    no: "لا يوجد",
  },
  STATUS: {
    active: "نشط",
    recovering: "تعافي",
    discharged: "خروج",
    critical: "حرج",
  },
  WAITING_SECTION: {
    servo: "سيرفو (تحويلات)",
    reception: "استقبال / طوارئ",
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
    intensive_care_high: "عناية كبيرة",
    intensive_care_medium: "عناية متوسطة",
    picu: "بيكيو (PICU)",
    incubator: "حضانة",
  },
};

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
