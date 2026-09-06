import ExcelJS from "../artifacts/bsch/node_modules/exceljs/lib/exceljs.nodejs.js";
import fs from "node:fs";

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("البيان", { views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }] });
sheet.mergeCells(1, 1, 1, 4);
sheet.mergeCells(2, 1, 2, 4);
sheet.getCell(1, 1).value = "مستشفى الاختبار";
sheet.getCell(2, 1).value = "تقرير الحالات";
const header = sheet.addRow(["الاسم", "القسم", "تاريخ الدخول", "الحالة"]);
header.eachCell(cell => {
  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
});
sheet.addRow(["أحمد علي", "العناية المركزة", "2026/09/06", "نشطة"]);
sheet.columns.forEach(column => { column.width = 18; });
const output = "/tmp/bsch-xlsx-format-test.xlsx";
await workbook.xlsx.writeFile(output);
const check = new ExcelJS.Workbook();
await check.xlsx.readFile(output);
const result = check.getWorksheet("البيان");
if (!result || result.views[0]?.rightToLeft !== true || result.getCell("A4").value !== "أحمد علي" || result.getCell("A3").fill.fgColor?.argb !== "FF2563EB") {
  throw new Error("XLSX formatting validation failed");
}
console.log(`XLSX_OK ${output} rows=${result.rowCount} rtl=${result.views[0].rightToLeft}`);
fs.unlinkSync(output);
