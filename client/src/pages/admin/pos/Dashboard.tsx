import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  ShoppingCart, DollarSign, Users, TrendingUp, Clock, Package,
  ArrowRight, Monitor, RefreshCw,
} from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: any; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function POSDashboard() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const now = new Date();
  const dateFrom = period === "today"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    : period === "week"
    ? new Date(now.getTime() - 7 * 86400000).toISOString()
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: stats, isLoading, refetch } = trpc.pos.dashboard.summary.useQuery({
    dateFrom,
    dateTo: now.toISOString(),
  });

  const { data: sessions } = trpc.pos.sessions.list.useQuery({ status: "open" });
  const openSessions = (sessions as any[]) ?? [];

  const totals = (stats?.totals as any) ?? {};
  const totalRevenue = Number(totals.totalRevenue ?? 0);
  const totalOrders = Number(totals.totalOrders ?? 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const topProducts = (stats?.topProducts as any[]) ?? [];
  const salesByDay = (stats?.dailySales as any[]) ?? [];
  const paymentBreakdown = (stats?.paymentBreakdown as any[]) ?? [];

  const COLORS = ["#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Monitor className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POS Dashboard</h1>
            <p className="text-sm text-gray-500">Sales performance and session overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["today", "week", "month"] as const).map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"}
              className={period === p ? "bg-amber-700 hover:bg-amber-800" : ""}
              onClick={() => setPeriod(p)}>
              {p === "today" ? "Today" : p === "week" ? "7 Days" : "This Month"}
            </Button>
          ))}
          <Button size="icon" variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Open Sessions Banner */}
      {openSessions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm font-medium text-green-800">
              {openSessions.length} active POS session{openSessions.length > 1 ? "s" : ""} running
            </p>
          </div>
          <Link href="/admin/pos/terminal">
            <Button size="sm" className="bg-green-700 hover:bg-green-800 gap-2">
              Open Terminal <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`AED ${totalRevenue.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${period === "today" ? "Today" : period === "week" ? "Last 7 days" : "This month"}`}
          icon={DollarSign}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="Total Orders"
          value={totalOrders.toString()}
          sub="Completed transactions"
          icon={ShoppingCart}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Avg. Order Value"
          value={`AED ${avgOrder.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Per transaction"
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          title="Active Sessions"
          value={openSessions.length.toString()}
          sub="Currently open"
          icon={Clock}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Over Time */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Sales Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByDay.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No sales data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: any) => [`AED ${Number(v).toFixed(2)}`, "Revenue"]}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#b45309" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentBreakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No payment data
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {paymentBreakdown.map((pm: any, i: number) => {
                  const total = paymentBreakdown.reduce((s: number, x: any) => s + Number(x.total), 0);
                  const pct = total > 0 ? (Number(pm.total) / total) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 capitalize">{pm.method?.replace("_", " ") ?? "Unknown"}</span>
                        <span className="text-gray-500">AED {Number(pm.total).toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Top Products</CardTitle>
            <Link href="/admin/pos/orders">
              <Button variant="ghost" size="sm" className="text-amber-700 gap-1 text-xs">
                View Orders <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                <Package className="w-8 h-8 mr-2 opacity-30" /> No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: any) => [v, "Units Sold"]} />
                  <Bar dataKey="qty" fill="#b45309" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-gray-800">Recent Sessions</CardTitle>
            <Link href="/admin/pos/sessions">
              <Button variant="ghost" size="sm" className="text-amber-700 gap-1 text-xs">
                All Sessions <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {openSessions.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <Clock className="w-8 h-8 opacity-30" />
                <p>No active sessions</p>
                <Link href="/admin/pos/sessions">
                  <Button size="sm" className="bg-amber-700 hover:bg-amber-800 mt-1">Open a Session</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {openSessions.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Session #{s.id}</p>
                      <p className="text-xs text-gray-500">
                        Opened {new Date(s.openedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Open</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        AED {Number(s.openingCash ?? 0).toFixed(2)} opening
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
