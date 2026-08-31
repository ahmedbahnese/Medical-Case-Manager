from pathlib import Path

path = Path('/home/ubuntu/Medical-Case-Manager/artifacts/api-server/src/routes/cases.ts')
text = path.read_text()
start = text.index('export function parseArabicCasesText')
end = text.index('\n\nrouter.get("/cases/:id"', start)
new = r'''export function parseArabicCasesText(text: string, defaultDeptId: number | null | undefined) {
  type ParsedCase = {
    patientName: string;
    parentName: string | null;
    fileNumber: string | null;
    age: string | null;
    diagnosis: string | null;
    parentPhone: string | null;
    nationalId: string | null;
    notes: string | null;
    artificialRespiration: string | null;
    departmentId: number | null;
  };

  const results: ParsedCase[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let currentCase: ParsedCase | null = null;

  const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const cleanValue = (value: string) => value.replace(/^\s*[*:：\-]+\s*/, "").trim();
  const extractValue = (line: string, labels: string[]) => {
    const pattern = new RegExp(`^\\s*(?:${labels.join("|")})\\s*[\\s*:_：\\-]*\\s*(.*?)\\s*$`, "i");
    const match = line.match(pattern);
    return match ? cleanValue(match[1]) : null;
  };
  const isFileNumber = (line: string) => /^\s*[0-9٠-٩]{5,10}\s*$/.test(line);
  const nameValue = (line: string) => extractValue(line, ["الاسم", "الإسم", "اسم الحالة", "اسم المريض", "الحالة", "المريض"]);
  const ageValue = (line: string) => extractValue(line, ["السن", "سن", "العمر", "عمره", "عمرها", "age"]);
  const diagnosisValue = (line: string) => extractValue(line, ["التشخيص", "تشخيص", "مرض", "dx", "diagnosis"]);
  const nationalIdValue = (line: string) => extractValue(line, ["الرقم القومي", "رقم قومي", "القومي", "قومي", "الهوية", "هوية"]);
  const phoneValue = (line: string) => extractValue(line, ["رقم الأهل", "رقم الاهل", "هاتف", "تليفون", "موبايل", "تلفون", "phone"]);

  const makeCase = (fileNumber: string | null = null): ParsedCase => ({
    patientName: "",
    parentName: null,
    fileNumber: fileNumber ? normalizeDigits(fileNumber) : null,
    age: null,
    diagnosis: null,
    parentPhone: null,
    nationalId: null,
    notes: null,
    artificialRespiration: null,
    departmentId: defaultDeptId ?? null,
  });

  const setPatientName = (target: ParsedCase, value: string) => {
    const patientName = cleanValue(value).replace(/^[*-]+\s*/, "").trim();
    if (!patientName) return;
    target.patientName = patientName;
    const guardian = patientName.match(/^(?:ابن|ابنة|بنت)\s+(.+)$/i);
    if (guardian) target.parentName = guardian[1].trim();
  };

  const finishCurrent = () => {
    if (currentCase && currentCase.patientName.trim()) results.push(currentCase);
  };

  for (const line of lines) {
    if (isFileNumber(line)) {
      finishCurrent();
      currentCase = makeCase(line);
      continue;
    }

    const parsedName = nameValue(line);
    if (parsedName) {
      if (!currentCase) currentCase = makeCase();
      setPatientName(currentCase, parsedName);
      continue;
    }

    if (!currentCase) continue;

    const parsedAge = ageValue(line);
    if (parsedAge && !currentCase.age) currentCase.age = parsedAge;

    const parsedDiagnosis = diagnosisValue(line);
    if (parsedDiagnosis && !currentCase.diagnosis) currentCase.diagnosis = parsedDiagnosis;

    const parsedNationalId = nationalIdValue(line);
    if (parsedNationalId && !currentCase.nationalId) {
      const digits = normalizeDigits(parsedNationalId).replace(/\D/g, "");
      if (digits.length >= 10) currentCase.nationalId = digits;
    }

    const parsedPhone = phoneValue(line);
    if (parsedPhone && !currentCase.parentPhone) {
      const digits = normalizeDigits(parsedPhone).replace(/[^0-9+]/g, "");
      if (digits.length >= 8) currentCase.parentPhone = digits;
    } else if (!currentCase.parentPhone) {
      const phone = normalizeDigits(line).match(/\b01[0-9]{9}\b/);
      if (phone) currentCase.parentPhone = phone[0];
    }

    const serviceText = line.toLowerCase();
    if (/(?:تنفس صناعي|جهاز تنفس|فنت|تهوية آلية|\bvent\b|\bmv\b|\bpcv\b)/i.test(serviceText)) {
      if (/(?:تردد عالي|عالي التردد|hfo|hfov)/i.test(serviceText)) currentCase.artificialRespiration = "high_frequency";
      else if (/(?:hfnc)/i.test(serviceText)) currentCase.artificialRespiration = "hfnc";
      else if (/(?:cpap|سباب|سي باب)/i.test(serviceText)) currentCase.artificialRespiration = "cpap";
      else currentCase.artificialRespiration = "vent";
    }
  }

  finishCurrent();

  if (results.length === 0 && text.trim()) {
    const firstLine = lines[0] ?? text.trim();
    const fallback = makeCase();
    setPatientName(fallback, firstLine);
    fallback.notes = text.trim();
    results.push(fallback);
  }

  return results;
}'''
path.write_text(text[:start] + new + text[end:])
