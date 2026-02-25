import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-[#3E1F00] mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats } = trpc.admin.dashboardStats.useQuery();
  const { data: salesChart } = trpc.admin.salesChart.useQuery();
  const recentOrders = stats?.recentOrders;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={`AED ${(stats?.totalRevenue || 0).toFixed(0)}`}
            sub="All time"
            icon={TrendingUp}
            color="bg-[#C9A84C]"
          />
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            sub={`${stats?.ordersByStatus?.find((s: { status: string; count: number }) => s.status === 'pending')?.count || 0} pending`}
            icon={ShoppingCart}
            color="bg-[#3E1F00]"
          />
          <StatCard
            title="Products"
            value={stats?.totalProducts || 0}
            sub={`${stats?.lowStockProducts?.length || 0} low stock`}
            icon={Package}
            color="bg-amber-500"
          />
          <StatCard
            title="Customers"
            value={stats?.totalCustomers || 0}
            sub="Registered"
            icon={Users}
            color="bg-purple-500"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sales chart */}
          <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
            <h3 className="font-semibold text-[#3E1F00] mb-4">Revenue (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={salesChart?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5ECD7" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`AED ${v.toFixed(0)}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by status */}
          <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
            <h3 className="font-semibold text-[#3E1F00] mb-4">Orders by Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.ordersByStatus || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5ECD7" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8D5A3] flex items-center justify-between">
            <h3 className="font-semibold text-[#3E1F00]">Recent Orders</h3>
            <a href="/admin/orders" className="text-sm text-[#C9A84C] hover:underline">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5ECD7]">
                <tr>
                  <th className="text-left px-5 py-3 text-[#3E1F00] font-semibold">Order</th>
                  <th className="text-left px-5 py-3 text-[#3E1F00] font-semibold">Customer</th>
                  <th className="text-left px-5 py-3 text-[#3E1F00] font-semibold">Status</th>
                  <th className="text-right px-5 py-3 text-[#3E1F00] font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders?.map((order: { id: number; orderNumber: string; shippingFullName: string | null; shippingPhone: string | null; status: string; total: string; createdAt: Date }) => (
                  <tr key={order.id} className="border-t border-[#E8D5A3] hover:bg-[#F5ECD7]/50">
                    <td className="px-5 py-3">
                      <a href={`/admin/orders/${order.id}`} className="font-medium text-[#C9A84C] hover:underline">
                        {order.orderNumber}
                      </a>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-3 text-[#3E1F00]">
                      {order.shippingFullName}
                      <p className="text-xs text-muted-foreground">{order.shippingPhone}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === "delivered" ? "bg-green-100 text-green-700" :
                        order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                        order.status === "processing" ? "bg-purple-100 text-purple-700" :
                        order.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[#3E1F00]">
                      AED {Number(order.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
