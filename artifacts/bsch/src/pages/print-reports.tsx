import { useGetDepartments, useGetDashboardStats } from "@workspace/api-client-react";
import { Printer, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LABELS, translate } from "@/lib/constants";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function PrintReports() {
  const { data: stats } = useGetDashboardStats();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Printer className="h-8 w-8 text-primary" />
            طباعة التقارير
          </h1>
          <p className="text-muted-foreground mt-2">معاينة وطباعة التقرير اليومي للمستشفى (نبطشية)</p>
        </div>
        <Button onClick={handlePrint} size="lg" className="gap-2 shadow-lg">
          <Printer className="h-5 w-5" /> طباعة التقرير الآن
        </Button>
      </div>

      <div className="bg-white text-black p-8 rounded-lg shadow-sm border print:p-0 print:border-none print:shadow-none min-h-[800px] max-w-4xl mx-auto print:max-w-none">
        
        {/* Print Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">مستشفى الأطفال التخصصي بالبحيرة</h1>
            <h2 className="text-xl font-bold mt-1">تقرير الإشغال اليومي (BSCH)</h2>
          </div>
          <div className="text-left text-sm font-bold">
            <p>تاريخ التقرير: {format(new Date(), 'PP', { locale: ar })}</p>
            <p>الوقت: {format(new Date(), 'p', { locale: ar })}</p>
          </div>
        </div>

        {stats && (
          <div className="space-y-8">
            {/* General Stats summary */}
            <div className="grid grid-cols-4 gap-4 mb-8 print-break-inside-avoid">
              <div className="border border-black p-3 text-center">
                <div className="text-sm font-bold border-b border-black pb-1 mb-2">إجمالي المسجلين</div>
                <div className="text-2xl font-bold">{stats.totalCases}</div>
              </div>
              <div className="border border-black p-3 text-center">
                <div className="text-sm font-bold border-b border-black pb-1 mb-2">الحالات النشطة</div>
                <div className="text-2xl font-bold">{stats.activeCases}</div>
              </div>
              <div className="border border-black p-3 text-center bg-gray-100 print:bg-transparent">
                <div className="text-sm font-bold border-b border-black pb-1 mb-2">تنفس صناعي</div>
                <div className="text-2xl font-bold">{stats.onRespiration}</div>
              </div>
              <div className="border border-black p-3 text-center">
                <div className="text-sm font-bold border-b border-black pb-1 mb-2">الانتظار بالاستقبال</div>
                <div className="text-2xl font-bold">{stats.waitingCases}</div>
              </div>
            </div>

            {/* Departments */}
            <div>
              <h3 className="text-lg font-bold bg-black text-white p-2 print:border print:border-black print:text-black print:bg-gray-200 mb-4">تفاصيل الأقسام</h3>
              <table className="w-full text-sm border-collapse border border-black mb-8 print-break-inside-avoid">
                <thead>
                  <tr className="bg-gray-100 print:bg-transparent">
                    <th className="border border-black p-2 text-right">القسم</th>
                    <th className="border border-black p-2 text-center">السعة السريرية</th>
                    <th className="border border-black p-2 text-center">مشغول</th>
                    <th className="border border-black p-2 text-center">شاغر</th>
                    <th className="border border-black p-2 text-center">حالات حرجة</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.departmentStats.map((d) => (
                    <tr key={d.departmentId}>
                      <td className="border border-black p-2 font-bold">{d.departmentName}</td>
                      <td className="border border-black p-2 text-center">{d.capacity}</td>
                      <td className="border border-black p-2 text-center font-bold">{d.activeCases}</td>
                      <td className="border border-black p-2 text-center">{d.capacity - d.activeCases}</td>
                      <td className="border border-black p-2 text-center">{d.criticalCases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Respiration */}
            <div className="print-break-inside-avoid">
              <h3 className="text-lg font-bold bg-black text-white p-2 print:border print:border-black print:text-black print:bg-gray-200 mb-4">تفصيل أجهزة التنفس الصناعي المستخدمة</h3>
              <div className="flex gap-8">
                {stats.respirationBreakdown.filter(r => r.count > 0).map(r => (
                  <div key={r.type} className="border border-black px-4 py-2 flex items-center gap-4">
                    <span className="font-bold">{translate(r.label, LABELS.ARTIFICIAL_RESPIRATION)}:</span>
                    <span className="text-xl font-bold">{r.count}</span>
                  </div>
                ))}
                {stats.respirationBreakdown.filter(r => r.count > 0).length === 0 && (
                  <div className="italic text-gray-500">لا يوجد مرضى على أجهزة التنفس الصناعي.</div>
                )}
              </div>
            </div>

            <div className="mt-16 pt-16 flex justify-between print-break-inside-avoid px-8">
              <div className="text-center">
                <div className="w-48 border-b border-black mb-2 h-8"></div>
                <div className="font-bold">توقيع النبطشية</div>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-black mb-2 h-8"></div>
                <div className="font-bold">توقيع المدير المناوب</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
