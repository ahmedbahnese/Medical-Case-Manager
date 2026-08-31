import * as XLSX from "xlsx";

type ExcelCell = string | number | boolean | null | undefined;

export function exportArabicXlsx(options: {
  filename: string;
  hospitalName: string;
  reportTitle: string;
  columns: string[];
  rows: ExcelCell[][];
  columnWidths?: number[];
}) {
  const now = new Date();
  const date = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const data: ExcelCell[][] = [
    [options.hospitalName],
    [options.reportTitle],
    [`${date} — عدد الحالات: ${options.rows.length}`],
    [],
    options.columns,
    ...options.rows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const lastColumn = Math.max(options.columns.length - 1, 0);
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumn } },
  ];
  worksheet["!cols"] = (options.columnWidths ?? options.columns.map(() => 18)).map((wch) => ({ wch }));
  worksheet["!views"] = [{ rightToLeft: true }];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };
  worksheet["!autofilter"] = {
    ref: `A5:${XLSX.utils.encode_col(lastColumn)}${Math.max(data.length, 5)}`,
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "البيان");
  const safeName = options.filename.toLowerCase().endsWith(".xlsx") ? options.filename : `${options.filename}.xlsx`;
  XLSX.writeFile(workbook, safeName, { bookType: "xlsx", compression: true });
}
