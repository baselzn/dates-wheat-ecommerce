import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["#C9A84C", "#3E1F00", "#E8D5A3", "#9A7A2E", "#6B3A0F", "#F5ECD7", "#D4A853", "#8B5E3C"];

export default function AdminAnalytics() {
  const { data: stats } = trpc.admin.dashboardStats.useQuery();
  const { data: salesChart } = trpc.admin.salesChart.useQuery();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#3E1F00]">Analytics</h2>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
          <h3 className="font-semibold text-[#3E1F00] mb-4">Daily Revenue (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={salesChart?.daily || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5ECD7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`AED ${v.toFixed(0)}`, "Revenue"]} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2} dot={false} name="Revenue (AED)" />
              <Line type="monotone" dataKey="orders" stroke="#3E1F00" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Orders by status */}
          <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
            <h3 className="font-semibold text-[#3E1F00] mb-4">Orders by Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats?.ordersByStatus || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {(stats?.ordersByStatus || []).map((_: unknown, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
            <h3 className="font-semibold text-[#3E1F00] mb-4">Top Products by Revenue</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesChart?.topProducts || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F5ECD7" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => [`AED ${v.toFixed(0)}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#C9A84C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `AED ${(stats?.totalRevenue || 0).toFixed(0)}` },
            { label: "Total Orders", value: stats?.totalOrders || 0 },
            { label: "Avg Order Value", value: `AED ${stats?.totalOrders ? ((stats?.totalRevenue || 0) / stats.totalOrders).toFixed(0) : 0}` },
            { label: "Total Customers", value: stats?.totalCustomers || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-[#E8D5A3] text-center">
              <p className="text-2xl font-bold text-[#3E1F00]">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
