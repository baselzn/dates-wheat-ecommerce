import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useState } from "react";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.admin.customers.list.useQuery({ search: search || undefined, page, limit: 20 });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3E1F00]">Customers</h2>
            <p className="text-sm text-muted-foreground">{data?.total || 0} registered customers</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search customers..." className="pl-9 border-[#E8D5A3] bg-white" />
        </div>
        <div className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F5ECD7]">
              <tr>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Customer</th>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Phone</th>
                <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Orders</th>
                <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Total Spent</th>
                <th className="text-center px-4 py-3 text-[#3E1F00] font-semibold">Role</th>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : data?.customers.map((c) => (
                <tr key={c.id} className="border-t border-[#E8D5A3] hover:bg-[#F5ECD7]/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-xs font-bold">
                        {(c.name || c.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[#3E1F00]">{c.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#3E1F00]">{c.orderCount || 0}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#3E1F00]">AED {Number(c.totalSpent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={c.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}>
                      {c.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!isLoading && data?.customers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
