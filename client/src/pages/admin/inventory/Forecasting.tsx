import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, AlertTriangle, CheckCircle, Package } from "lucide-react";

function daysToStockout(stockQty: number, dailyVelocity: number): number | null {
  if (dailyVelocity <= 0) return null;
  return Math.floor(stockQty / dailyVelocity);
}

function StockoutBadge({ days }: { days: number | null }) {
  if (days === null) return <Badge variant="outline" className="text-muted-foreground">No sales</Badge>;
  if (days < 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (days <= 7) return <Badge variant="destructive">{days}d</Badge>;
  if (days <= 14) return <Badge className="bg-orange-500 text-white">{days}d</Badge>;
  if (days <= 30) return <Badge className="bg-yellow-500 text-white">{days}d</Badge>;
  return <Badge variant="outline" className="text-green-600">{days}d+</Badge>;
}

export default function Forecasting() {
  const { data: stockData } = trpc.inventory.stockLevels.list.useQuery();
  const { data: movementsData } = trpc.inventory.movements.list.useQuery({ limit: 500 } as any);

  // Calculate 30-day sales velocity per product
  const velocityMap: Record<number, number> = {};
  if (movementsData) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const m of movementsData as any[]) {
      if ((m.type === "sale" || m.type === "pos_sale") && new Date(m.createdAt).getTime() > thirtyDaysAgo) {
        const qty = Math.abs(parseFloat(m.qty ?? "0"));
        velocityMap[m.productId] = (velocityMap[m.productId] ?? 0) + qty;
      }
    }
    // Convert total 30-day to daily
    for (const pid in velocityMap) {
      velocityMap[parseInt(pid)] = velocityMap[parseInt(pid)] / 30;
    }
  }

  // Build forecast rows
  const rows = ((stockData as any[]) ?? []).map((s: any) => {
    const stock = parseFloat(s.qty ?? "0");
    const reorder = parseFloat(s.reorderPoint ?? "0");
    const velocity = velocityMap[s.productId] ?? 0;
    const days = daysToStockout(stock, velocity);
    const urgency = days === null ? "none" : days < 0 ? "critical" : days <= 7 ? "critical" : days <= 14 ? "high" : days <= 30 ? "medium" : "ok";
    return { ...s, stock, reorder, velocity, days, urgency };
  }).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, none: 3, ok: 4 };
    return (order[a.urgency as keyof typeof order] ?? 4) - (order[b.urgency as keyof typeof order] ?? 4);
  });

  const criticalCount = rows.filter(r => r.urgency === "critical").length;
  const highCount = rows.filter(r => r.urgency === "high").length;
  const mediumCount = rows.filter(r => r.urgency === "medium").length;
  const okCount = rows.filter(r => r.urgency === "ok" || r.urgency === "none").length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory Forecasting</h1>
          <p className="text-muted-foreground text-sm">Stockout predictions based on 30-day sales velocity</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Critical (≤7d)", count: criticalCount, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20", icon: AlertTriangle },
            { label: "High (≤14d)", count: highCount, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20", icon: TrendingDown },
            { label: "Medium (≤30d)", count: mediumCount, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20", icon: Package },
            { label: "Healthy (>30d)", count: okCount, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20", icon: CheckCircle },
          ].map(item => (
            <Card key={item.label} className={item.bg}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Forecast Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Forecast by Product</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Warehouse</th>
                    <th className="text-right px-4 py-3 font-medium">Stock</th>
                    <th className="text-right px-4 py-3 font-medium">Reorder At</th>
                    <th className="text-right px-4 py-3 font-medium">Daily Sales</th>
                    <th className="text-center px-4 py-3 font-medium">Days Left</th>
                    <th className="text-left px-4 py-3 font-medium w-32">Stock Health</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No stock data available
                      </td>
                    </tr>
                  ) : (
                    rows.map((r: any) => {
                      const healthPct = r.days === null ? 100 : Math.min(100, Math.max(0, (r.days / 60) * 100));
                      const barColor = r.urgency === "critical" ? "bg-red-500" : r.urgency === "high" ? "bg-orange-500" : r.urgency === "medium" ? "bg-yellow-500" : "bg-green-500";
                      return (
                        <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{r.productName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.warehouseName ?? "Main"}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.stock.toFixed(0)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{r.reorder.toFixed(0)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {r.velocity > 0 ? r.velocity.toFixed(1) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StockoutBadge days={r.days} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${healthPct}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
