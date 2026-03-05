import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, Calendar, TrendingUp, CreditCard, Package } from "lucide-react";

function fmt(n: string | number) {
  return `AED ${parseFloat(String(n)).toFixed(2)}`;
}

export default function ZReport() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [queryDate, setQueryDate] = useState(today);

  const { data, isLoading } = trpc.pos.zReport.generate.useQuery({ date: queryDate });

  const handleGenerate = () => setQueryDate(date);

  const handlePrint = () => window.print();

  const handleDownload = () => {
    if (!data) return;
    const lines = [
      `Z-REPORT — ${data.date}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "=== SUMMARY ===",
      `Total Transactions: ${data.summary.totalTransactions ?? 0}`,
      `Total Revenue:      ${fmt(data.summary.totalRevenue ?? 0)}`,
      `Total VAT:          ${fmt(data.summary.totalVat ?? 0)}`,
      `Total Discounts:    ${fmt(data.summary.totalDiscounts ?? 0)}`,
      `Total Refunds:      ${fmt(data.summary.totalRefunds ?? 0)}`,
      `Voids:              ${data.summary.totalVoids ?? 0}`,
      `Net Revenue:        ${fmt(data.summary.netRevenue ?? 0)}`,
      "",
      "=== BY PAYMENT METHOD ===",
      ...(data.byPaymentMethod ?? []).map((m: any) =>
        `${m.paymentMethod}: ${m.count} txns — ${fmt(m.total)}`
      ),
      "",
      "=== TOP PRODUCTS ===",
      ...(data.topProducts ?? []).map((p: any, i: number) =>
        `${i + 1}. ${p.productName} — Qty: ${p.totalQty} — ${fmt(p.totalRevenue)}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `z-report-${data.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxHourlyTotal = Math.max(
    1,
    ...(data?.hourlySales ?? []).map((h: any) => parseFloat(h.total ?? "0"))
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 print:p-2">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Z-Report (End of Day)</h1>
            <p className="text-muted-foreground text-sm">Daily POS summary report</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!data}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>

        {/* Date Picker */}
        <Card className="print:hidden">
          <CardContent className="pt-4">
            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button onClick={handleGenerate} disabled={isLoading}>
                <Calendar className="w-4 h-4 mr-2" />
                {isLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            {/* Print Header */}
            <div className="hidden print:block text-center border-b pb-4 mb-4">
              <h1 className="text-xl font-bold">Dates & Wheat | تمر وقمح</h1>
              <p className="text-sm">Z-Report — {data.date}</p>
              <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Net Revenue", value: fmt(data.summary.netRevenue ?? 0), icon: TrendingUp, color: "text-green-600" },
                { label: "Total VAT", value: fmt(data.summary.totalVat ?? 0), icon: CreditCard, color: "text-blue-600" },
                { label: "Transactions", value: String(data.summary.totalTransactions ?? 0), icon: Package, color: "text-purple-600" },
                { label: "Refunds", value: fmt(data.summary.totalRefunds ?? 0), icon: CreditCard, color: "text-red-600" },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {(data.byPaymentMethod ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions</p>
                  ) : (
                    <div className="space-y-3">
                      {(data.byPaymentMethod ?? []).map((m: any) => (
                        <div key={m.paymentMethod} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{m.paymentMethod}</Badge>
                            <span className="text-sm text-muted-foreground">{m.count} txns</span>
                          </div>
                          <span className="font-semibold">{fmt(m.total)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{fmt(data.summary.netRevenue ?? 0)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {(data.topProducts ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales data</p>
                  ) : (
                    <div className="space-y-2">
                      {(data.topProducts ?? []).slice(0, 8).map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                            <span className="truncate">{p.productName}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-muted-foreground">×{p.totalQty}</span>
                            <span className="font-medium">{fmt(p.totalRevenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hourly Sales Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hourly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {hours.map((h) => {
                    const entry = (data.hourlySales ?? []).find((x: any) => Number(x.hour) === h);
                    const total = entry ? parseFloat(entry.total ?? "0") : 0;
                    const height = total > 0 ? Math.max(8, (total / maxHourlyTotal) * 80) : 4;
                    return (
                      <div key={h} className="flex flex-col items-center flex-1 gap-1">
                        <div
                          className={`w-full rounded-t transition-all ${total > 0 ? "bg-amber-500" : "bg-muted"}`}
                          style={{ height: `${height}px` }}
                          title={`${h}:00 — ${fmt(total)}`}
                        />
                        {h % 4 === 0 && (
                          <span className="text-xs text-muted-foreground">{h}h</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Summary Table for Print */}
            <Card className="hidden print:block">
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="py-1">Total Revenue</td><td className="text-right font-medium">{fmt(data.summary.totalRevenue ?? 0)}</td></tr>
                    <tr><td className="py-1">Total Discounts</td><td className="text-right font-medium">-{fmt(data.summary.totalDiscounts ?? 0)}</td></tr>
                    <tr><td className="py-1">Total Refunds</td><td className="text-right font-medium">-{fmt(data.summary.totalRefunds ?? 0)}</td></tr>
                    <tr><td className="py-1">VAT Collected</td><td className="text-right font-medium">{fmt(data.summary.totalVat ?? 0)}</td></tr>
                    <tr className="border-t font-bold"><td className="py-1">Net Revenue</td><td className="text-right">{fmt(data.summary.netRevenue ?? 0)}</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}

        {!data && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a date and click Generate Report to view the Z-Report.
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
