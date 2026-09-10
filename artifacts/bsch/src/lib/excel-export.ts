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
  const esc = (value: ExcelCell) => String(value ?? "").replace(/[&<>\"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]!));
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#111827;padding:12px;display:flex;flex-direction:column;gap:10px";
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;color:white;font-family:Tahoma,Arial,sans-serif";
  const title = document.createElement("strong");
  title.textContent = `معاينة Excel قبل الحفظ — ${options.rows.length} سجل`;
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px";
  const button = (label: string, color: string) => { const b = document.createElement("button"); b.textContent = label; b.style.cssText = `border:0;border-radius:6px;padding:9px 14px;background:${color};color:white;cursor:pointer;font-weight:bold`; return b; };
  const saveButton = button("حفظ XLSX", "#16a34a");
  const printButton = button("طباعة", "#0ea5e9");
  const closeButton = button("إغلاق", "#475569");
  const frame = document.createElement("iframe");
  frame.title = "معاينة جدول Excel";
  frame.style.cssText = "width:100%;flex:1;border:0;border-radius:6px;background:white";
  const previewRows = options.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
  const previewDoc = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial,Tahoma,sans-serif;margin:24px;color:#111827}h1,h2,p{text-align:center;margin:6px}p{color:#4b5563}table{border-collapse:collapse;width:100%;min-width:1100px}th{background:#2563eb;color:#fff;font-weight:bold}th,td{border:1px solid #d1d5db;padding:9px;text-align:right;vertical-align:top;white-space:pre-wrap}tr:nth-child(even){background:#f8fafc}@media print{body{margin:0}h1,h2,p{margin:2px}}</style></head><body><h1>${esc(options.hospitalName)}</h1><h2>${esc(options.reportTitle)}</h2><p>${esc(date)} — عدد الحالات: ${options.rows.length}</p><table><thead><tr>${options.columns.map(esc).map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${previewRows}</tbody></table></body></html>`;
  frame.srcdoc = previewDoc;
  saveButton.addEventListener("click", async () => { const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = safeName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  printButton.addEventListener("click", () => frame.contentWindow?.print());
  closeButton.addEventListener("click", () => overlay.remove());
  actions.append(saveButton, printButton, closeButton); toolbar.append(title, actions); overlay.append(toolbar, frame); document.body.appendChild(overlay);

}
