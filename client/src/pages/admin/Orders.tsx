import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Eye, Search, Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const handleExportCSV = () => {
    if (!data?.orders?.length) return;
    const headers = ["Order Number", "Date", "Customer", "Phone", "Payment", "Status", "Total (AED)"];
    const rows = data.orders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString(),
      o.shippingFullName,
      o.shippingPhone,
      o.paymentMethod,
      o.status,
      Number(o.total).toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const { data, isLoading, refetch } = trpc.admin.orders.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const { data: orderDetail } = trpc.admin.orders.detail.useQuery(
    selectedOrder!,
    { enabled: !!selectedOrder }
  );

  const updateStatus = trpc.admin.orders.updateStatus.useMutation();

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status });
      toast.success("Order status updated");
      refetch();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3E1F00]">Orders</h2>
            <p className="text-sm text-muted-foreground">{data?.total || 0} total orders</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by order number or customer..."
              className="pl-9 border-[#E8D5A3] bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 border-[#E8D5A3] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5ECD7]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Order</th>
                  <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Payment</th>
                  <th className="text-center px-4 py-3 text-[#3E1F00] font-semibold">Status</th>
                  <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Total</th>
                  <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.orders.map((order) => (
                  <tr key={order.id} className="border-t border-[#E8D5A3] hover:bg-[#F5ECD7]/50 cursor-pointer transition-colors" onClick={() => navigate(`/admin/orders/${order.orderNumber}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#C9A84C]">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#3E1F00]">{order.shippingFullName}</p>
                      <p className="text-xs text-muted-foreground">{order.shippingPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={order.paymentMethod === "cod" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}>
                        {order.paymentMethod === "cod" ? "COD" : "Card"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Select
                        value={order.status}
                        onValueChange={(v) => handleStatusChange(order.id, v)}
                      >
                        <SelectTrigger className={`h-7 text-xs w-32 mx-auto ${STATUS_COLORS[order.status] || ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map(s => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#3E1F00]">
                      AED {Number(order.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedOrder(order.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && data?.orders.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-[#C9A84C] text-[#C9A84C]">Previous</Button>
            <Button variant="outline" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)} className="border-[#C9A84C] text-[#C9A84C]">Next</Button>
          </div>
        )}

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#3E1F00]">Order {orderDetail?.orderNumber}</DialogTitle>
            </DialogHeader>
            {orderDetail && (
              <div className="space-y-4 mt-2">
                {/* Status & Payment */}
                <div className="flex gap-3">
                  <Badge className={STATUS_COLORS[orderDetail.status] || ""}>{orderDetail.status}</Badge>
                  <Badge className={orderDetail.paymentMethod === "cod" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}>
                    {orderDetail.paymentMethod === "cod" ? "Cash on Delivery" : "Card"}
                  </Badge>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-semibold text-[#3E1F00] mb-2">Items</h4>
                  <div className="space-y-2">
                    {orderDetail.items?.map((item: { id: number; productNameEn: string; variantName?: string | null; quantity: number; unitPrice: string; totalPrice: string; productImage?: string | null }) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 bg-[#F5ECD7] rounded-lg">
                        <div className="w-10 h-10 rounded bg-white overflow-hidden shrink-0">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productNameEn} className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full flex items-center justify-center">🍬</div>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#3E1F00]">{item.productNameEn}</p>
                          {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">AED {Number(item.totalPrice).toFixed(2)}</p>
                          <p className="text-muted-foreground">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-[#E8D5A3]" />

                {/* Totals */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>AED {Number(orderDetail.subtotal).toFixed(2)}</span></div>
                  {Number(orderDetail.discountAmount) > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>- AED {Number(orderDetail.discountAmount).toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>AED {Number(orderDetail.vatAmount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(orderDetail.shippingAmount) === 0 ? "FREE" : `AED ${Number(orderDetail.shippingAmount).toFixed(2)}`}</span></div>
                  <div className="flex justify-between font-bold text-[#3E1F00] text-base pt-1 border-t border-[#E8D5A3]">
                    <span>Total</span><span>AED {Number(orderDetail.total).toFixed(2)}</span>
                  </div>
                </div>

                <Separator className="bg-[#E8D5A3]" />

                {/* Shipping */}
                <div>
                  <h4 className="font-semibold text-[#3E1F00] mb-1">Shipping Address</h4>
                  <p className="text-sm text-muted-foreground">{orderDetail.shippingFullName}</p>
                  <p className="text-sm text-muted-foreground">{orderDetail.shippingAddressLine1}</p>
                  <p className="text-sm text-muted-foreground">{orderDetail.shippingCity ? `${orderDetail.shippingCity}, ` : ""}{orderDetail.shippingEmirate}</p>
                  <p className="text-sm text-muted-foreground">{orderDetail.shippingPhone}</p>
                </div>

                {/* Update status */}
                <div>
                  <h4 className="font-semibold text-[#3E1F00] mb-2">Update Status</h4>
                  <div className="flex gap-2 flex-wrap">
                    {ORDER_STATUSES.map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={orderDetail.status === s ? "default" : "outline"}
                        className={orderDetail.status === s ? "bg-[#C9A84C] text-white" : "border-[#E8D5A3] text-[#3E1F00]"}
                        onClick={() => handleStatusChange(orderDetail.id, s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
