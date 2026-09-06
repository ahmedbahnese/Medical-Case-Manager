import ExcelJS from "exceljs";

type ExcelCell = string | number | boolean | null | undefined;

export async function exportArabicXlsx(options: {
  filename: string;
  hospitalName: string;
  reportTitle: string;
  columns: string[];
  rows: ExcelCell[][];
  columnWidths?: number[];
}) {
  const now = new Date();
  const date = now.toLocaleDateString("ar-EG", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BSCH";
  workbook.created = now;
  const sheet = workbook.addWorksheet("البيان", { views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }] });
  const last = Math.max(options.columns.length, 1);
  sheet.mergeCells(1, 1, 1, last); sheet.mergeCells(2, 1, 2, last); sheet.mergeCells(3, 1, 3, last);
  sheet.getCell(1, 1).value = options.hospitalName;
  sheet.getCell(2, 1).value = options.reportTitle;
  sheet.getCell(3, 1).value = `${date} — عدد الحالات: ${options.rows.length}`;
  for (const row of [1, 2, 3]) {
    const cell = sheet.getCell(row, 1);
    cell.font = { name: "Arial", size: row === 1 ? 16 : 12, bold: true, color: { argb: "FF17365D" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(row).height = row === 1 ? 28 : 22;
  }
  const header = sheet.addRow(options.columns);
  header.height = 24;
  header.eachCell(cell => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: "FF9CA3AF" } }, bottom: { style: "thin", color: { argb: "FF9CA3AF" } }, left: { style: "thin", color: { argb: "FF9CA3AF" } }, right: { style: "thin", color: { argb: "FF9CA3AF" } } };
  });
  options.rows.forEach(values => {
    const row = sheet.addRow(values.map(v => v ?? ""));
    row.eachCell(cell => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
      cell.border = { top: { style: "hair", color: { argb: "FFD1D5DB" } }, bottom: { style: "hair", color: { argb: "FFD1D5DB" } }, left: { style: "hair", color: { argb: "FFD1D5DB" } }, right: { style: "hair", color: { argb: "FFD1D5DB" } } };
    });
  });
  sheet.columns.forEach((column, index) => { column.width = options.columnWidths?.[index] ?? 18; });
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(sheet.rowCount, 5), column: last } };
  const safeName = options.filename.toLowerCase().endsWith(".xlsx") ? options.filename : `${options.filename}.xlsx`;
  const preview = window.open("", "bsch-xlsx-preview", "width=1400,height=900,resizable=yes,scrollbars=yes");
  if (!preview) { window.alert("يرجى السماح بالنوافذ المنبثقة لعرض معاينة التقرير"); return; }
  const esc = (value: ExcelCell) => String(value ?? "").replace(/[&<>\"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]!));
  const previewRows = options.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
  preview.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>معاينة ${esc(options.reportTitle)}</title><style>
    body{font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#111827}.toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:18px}.toolbar button{background:#2563eb;color:white;border:0;border-radius:6px;padding:10px 18px;font-size:15px;cursor:pointer}.toolbar button.secondary{background:#6b7280}main{background:#fff;padding:24px;box-shadow:0 2px 12px #0001;overflow:auto}h1,h2,p{text-align:center;margin:6px}.meta{color:#4b5563}table{border-collapse:collapse;width:100%;min-width:900px;margin-top:20px}th{background:#2563eb;color:#fff;font-weight:bold}th,td{border:1px solid #d1d5db;padding:9px;text-align:right;vertical-align:top;white-space:pre-wrap}tr:nth-child(even){background:#f8fafc}@media print{.toolbar{display:none}body{background:#fff;padding:0}main{box-shadow:none}}
  </style></head><body><div class="toolbar"><strong>معاينة التقرير قبل الحفظ — ${options.rows.length} سجل</strong><div><button id="save">حفظ XLSX</button> <button class="secondary" onclick="window.print()">طباعة</button> <button class="secondary" onclick="window.close()">إغلاق</button></div></div><main><h1>${esc(options.hospitalName)}</h1><h2>${esc(options.reportTitle)}</h2><p class="meta">${esc(date)} — عدد الحالات: ${options.rows.length}</p><table><thead><tr>${options.columns.map(esc).map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${previewRows}</tbody></table></main></body></html>`);
  preview.document.close();
  preview.document.getElementById("save")?.addEventListener("click", async () => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = preview.document.createElement("a"); a.href = url; a.download = safeName; preview.document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
