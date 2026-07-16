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
    high_frequency: "تردد عالي",
    vent: "فنت (VENT)",
    cpap: "سي باب (CPAP)",
    standby: "استعداد",
    no: "لا يوجد",
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
    cancelled: "ملغي",
  }
}

export function translate(key: string, dict: Record<string, string>) {
  return dict[key] || key;
}
