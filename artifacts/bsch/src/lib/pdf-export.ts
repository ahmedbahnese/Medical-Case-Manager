/**
 * Show a print-ready PDF preview inside the application.
 * The user can review the report and print it to a PDF printer without popup windows.
 */
export function exportPDF(
  htmlBody: string,
  title: string,
  logoBase64?: string | null,
  watermarkBase64?: string | null,
) {
  const logoHtml = logoBase64
    ? `<div class="report-logo"><img src="${logoBase64}" alt="logo" /></div>`
    : "";
  const watermarkHtml = watermarkBase64
    ? `<div class="watermark" style="background-image:url('${watermarkBase64}')"></div>`
    : "";

  const doc = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Arial Unicode MS','Calibri','Tahoma',Arial,sans-serif;
      direction: rtl;
      font-size: 9.5pt;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .watermark {
      position: fixed;
      inset: 0;
      background-repeat: no-repeat;
      background-position: center;
      background-size: 28%;
      opacity: .075;
      pointer-events: none;
      z-index: 0;
    }
    body > *:not(.watermark) { position: relative; z-index: 1; }
    .report-logo { text-align: center; height: 34pt; margin-bottom: 3pt; }
    .report-logo img { height: 30pt; max-width: 120pt; object-fit: contain; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    td, th { border: 1px solid #000; padding: 3px 6px; text-align: right; vertical-align: top; }
    th { background-color: #d9e1f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; }
    tr:nth-child(even) td { background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6pt; margin-bottom: 10pt; }
    h2, h3 { text-align: center; margin: 3pt 0; }
    p { margin: 2pt 0; }
    @page { size: A4 landscape; margin: 1cm 0.8cm; }
  </style>
</head>
<body>
  ${watermarkHtml}
  ${logoHtml}
  ${htmlBody}
</body>
</html>`;

  const backdrop = document.createElement("div");
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "معاينة ملف PDF");
  backdrop.style.cssText = [
    "position:fixed", "inset:0", "z-index:2147483647", "display:flex",
    "flex-direction:column", "background:#111827", "padding:12px", "gap:10px",
  ].join(";");

  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;color:white;font-family:Tahoma,Arial,sans-serif";

  const heading = document.createElement("strong");
  heading.textContent = `معاينة PDF: ${title}`;
  heading.style.fontSize = "16px";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px";

  const nativePdfButton = document.createElement("button");
  nativePdfButton.type = "button";
  nativePdfButton.textContent = "حفظ PDF";
  nativePdfButton.style.cssText = "border:0;border-radius:6px;padding:9px 14px;background:#16a34a;color:#fff;cursor:pointer;font-weight:bold";

  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.textContent = "طباعة";
  printButton.style.cssText = "border:0;border-radius:6px;padding:9px 14px;background:#0ea5e9;color:#fff;cursor:pointer;font-weight:bold";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "إغلاق";
  closeButton.style.cssText = "border:1px solid #94a3b8;border-radius:6px;padding:9px 14px;background:#334155;color:#fff;cursor:pointer";

  const frame = document.createElement("iframe");
  frame.title = "معاينة تقرير PDF";
  frame.style.cssText = "width:100%;flex:1;border:0;border-radius:6px;background:#fff";
  frame.setAttribute("sandbox", "allow-same-origin allow-modals");
  frame.srcdoc = doc;

  const close = () => backdrop.remove();
  closeButton.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  nativePdfButton.addEventListener("click", async () => {
    const savePDF = (window as any).electronAPI?.savePDF;
    if (!savePDF) {
      alert("الحفظ المباشر متاح داخل نسخة البرنامج المثبتة. استخدم زر الطباعة ثم اختر Microsoft Print to PDF.");
      return;
    }
    try {
      const result = await savePDF(doc, title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`);
      if (!result?.canceled) alert("تم حفظ ملف PDF بنجاح.");
    } catch (error) {
      console.error("PDF save failed", error);
      alert("تعذر حفظ ملف PDF. استخدم زر الطباعة كحل بديل.");
    }
  });

  printButton.addEventListener("click", () => {
    const frameWindow = frame.contentWindow;
    if (!frameWindow) {
      alert("تعذر فتح معاينة PDF. حاول مرة أخرى.");
      return;
    }
    frameWindow.focus();
    frameWindow.print();
  });

  actions.appendChild(nativePdfButton);
  actions.appendChild(printButton);
  actions.appendChild(closeButton);
  toolbar.appendChild(heading);
  toolbar.appendChild(actions);
  backdrop.appendChild(toolbar);
  backdrop.appendChild(frame);
  document.body.appendChild(backdrop);
  closeButton.focus();
}
