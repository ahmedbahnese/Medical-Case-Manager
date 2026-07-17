/**
 * Export an HTML string as a Microsoft Word (.doc) file.
 * Word opens HTML files with .doc extension — this is the standard
 * browser-side Word export trick that works for Arabic RTL content.
 */
export function exportWordDoc(htmlBody: string, filename: string) {
  const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
    xmlns:w='urn:schemas-microsoft-com:office:word'
    xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'/>
  <meta name='ProgId' content='Word.Document'/>
  <style>
    body { font-family: 'Arial Unicode MS','Calibri','Tahoma',Arial,sans-serif; direction: rtl; font-size: 11pt; color: #000; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; }
    td, th { border: 1px solid #000; padding: 4px 8px; text-align: right; vertical-align: top; }
    th { background-color: #d9e1f2; font-weight: bold; }
    .center { text-align: center; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6pt; margin-bottom: 12pt; }
    h2, h3 { text-align: center; margin: 4pt 0; }
    p { margin: 2pt 0; }
    @page WordSection1 { size: 21cm 29.7cm; margin: 2cm 1.5cm; mso-page-orientation: portrait; }
    div.WordSection1 { page: WordSection1; }
  </style>
</head>
<body dir='rtl'>
<div class='WordSection1'>
${htmlBody}
</div>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + doc], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : filename + '.doc';
  a.click();
  URL.revokeObjectURL(url);
}
