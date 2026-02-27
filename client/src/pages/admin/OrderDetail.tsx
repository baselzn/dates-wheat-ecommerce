import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Package, MapPin, User, CreditCard, Truck, Clock } from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  processing: "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [newStatus, setNewStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const { data: order, isLoading, refetch } = trpc.admin.orders.byNumber.useQuery(id ?? "", {
    enabled: !!id,
  });

  const updateStatus = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated");
      refetch();
      setNewStatus("");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const handleStatusUpdate = () => {
    if (!order || !newStatus) return;
    updateStatus.mutate({
      id: order.id,
      status: newStatus,
      trackingNumber: trackingNumber || undefined,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Button variant="ghost" onClick={() => navigate("/admin/orders")} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Button>
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Order not found</p>
              <p className="text-sm text-gray-400 mt-1">No order matches "{id}"</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const items = (order as typeof order & { items?: Array<{ id: number; productId: number; variantId?: number; productNameEn: string; quantity: number; unitPrice: string; totalPrice: string }> }).items ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#3E1F00]">Order {order.orderNumber}</h1>
              <p className="text-sm text-gray-500">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
              </p>
            </div>
          </div>
          <Badge className={`text-sm px-3 py-1 border ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: items + timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3E1F00]">
                  <Package className="h-5 w-5" /> Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-gray-400 text-sm">No items found.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-[#3E1F00]">{item.productNameEn}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity} × {Number(item.unitPrice).toFixed(2)} SAR</p>
                        </div>
                        <p className="font-semibold text-[#C9A84C]">{Number(item.totalPrice).toFixed(2)} SAR</p>
                      </div>
                    ))}
                  </div>
                )}
                <Separator className="my-4" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{subtotal.toFixed(2)} SAR</span>
                  </div>
                  {Number(order.shippingAmount) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>{Number(order.shippingAmount).toFixed(2)} SAR</span>
                    </div>
                  )}
                  {Number(order.vatAmount) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>VAT (5%)</span>
                      <span>{Number(order.vatAmount).toFixed(2)} SAR</span>
                    </div>
                  )}
                  {Number(order.discountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{Number(order.discountAmount).toFixed(2)} SAR</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-base text-[#3E1F00]">
                    <span>Total</span>
                    <span>{Number(order.total).toFixed(2)} SAR</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3E1F00]">
                  <Clock className="h-5 w-5" /> Update Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="text"
                    placeholder="Tracking number (optional)"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    className="flex-1 min-w-[180px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updateStatus.isPending}
                    className="bg-[#C9A84C] hover:bg-[#b8943e] text-white"
                  >
                    {updateStatus.isPending ? "Updating…" : "Update"}
                  </Button>
                </div>
                {order.trackingNumber && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Current tracking: <span className="font-mono font-medium">{order.trackingNumber}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: customer + address + payment */}
          <div className="space-y-6">
            {/* Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3E1F00] text-base">
                  <User className="h-4 w-4" /> Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{order.shippingFullName || "Guest"}</p>
                {order.guestEmail && <p className="text-gray-500">{order.guestEmail}</p>}
                {(order.shippingPhone || order.guestPhone) && <p className="text-gray-500">{order.shippingPhone || order.guestPhone}</p>}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3E1F00] text-base">
                  <MapPin className="h-4 w-4" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-gray-600">
                {order.shippingAddressLine1 ? (
                  <>
                    <p>{order.shippingAddressLine1}</p>
                    {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
                  </>
                ) : (
                  <p className="text-gray-400">No address provided</p>
                )}
                {order.shippingCity && <p>{order.shippingCity}{order.shippingEmirate ? `, ${order.shippingEmirate}` : ""}{order.shippingCountry ? `, ${order.shippingCountry}` : ""}</p>}
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3E1F00] text-base">
                  <CreditCard className="h-4 w-4" /> Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-medium capitalize">{order.paymentMethod ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge variant="outline" className={order.paymentStatus === "paid" ? "text-green-700 border-green-300" : "text-yellow-700 border-yellow-300"}>
                    {order.paymentStatus ?? "pending"}
                  </Badge>
                </div>
                {order.couponCode && (
                  <div className="flex justify-between">
                    <span>Coupon</span>
                    <span className="font-mono font-medium text-green-600">{order.couponCode}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#3E1F00] text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
