/**
 * Export an HTML string as a PDF using a hidden print window.
 * Opens a styled window with RTL Arabic support, triggers browser print dialog.
 */
export function exportPDF(htmlBody: string, title: string, logoBase64?: string | null) {
  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="logo" style="height:60px;object-fit:contain;margin-bottom:6pt;" /><br/>`
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
      font-size: 10pt;
      color: #000;
      margin: 0;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 8pt;
    }
    td, th {
      border: 1px solid #000;
      padding: 3px 6px;
      text-align: right;
      vertical-align: top;
    }
    th {
      background-color: #d9e1f2 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-weight: bold;
    }
    tr:nth-child(even) td {
      background-color: #f5f5f5 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6pt;
      margin-bottom: 10pt;
    }
    h2, h3 { text-align: center; margin: 3pt 0; }
    p { margin: 2pt 0; }
    @page {
      size: A4 portrait;
      margin: 1.5cm 1cm;
    }
  </style>
</head>
<body>
  ${logoHtml}
  ${htmlBody}
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("يرجى السماح للنوافذ المنبثقة في المتصفح"); return; }
  win.document.write(doc);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 600);
}
