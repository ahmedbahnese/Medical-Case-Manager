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
  if (!window.confirm(`تم تجهيز معاينة تقرير «${options.reportTitle}» بعدد ${options.rows.length} سجل. هل تريد حفظ ملف XLSX الحقيقي؟`)) return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = safeName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
