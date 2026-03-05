import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Search, CheckCircle2, Clock, Truck, Home, ArrowLeft, MapPin } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock, color: "text-amber-500" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "text-blue-500" },
  { key: "processing", label: "Processing", icon: Package, color: "text-purple-500" },
  { key: "shipped", label: "Shipped", icon: Truck, color: "text-indigo-500" },
  { key: "delivered", label: "Delivered", icon: Home, color: "text-green-500" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function OrderTrackingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const [orderNumber, setOrderNumber] = useState(params.get("order") ?? "");
  const [searchInput, setSearchInput] = useState(params.get("order") ?? "");

  const { data: order, isLoading, error } = trpc.orders.byNumber.useQuery(
    orderNumber,
    { enabled: orderNumber.length > 0 }
  );

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex(s => s.key === (order as { status: string }).status)
    : -1;

  const handleSearch = () => {
    setOrderNumber(searchInput.trim());
    window.history.replaceState(null, "", `/track?order=${encodeURIComponent(searchInput.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Track Your Order
            </h1>
            <p className="text-sm text-muted-foreground">Enter your order number to see the latest status</p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. ORD-2024-001"
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} className="h-11 gap-2 px-5">
                <Search className="w-4 h-4" />
                Track
              </Button>
            </div>
            {user && (
              <p className="text-xs text-muted-foreground mt-2">
                You can also view all your orders in{" "}
                <button onClick={() => navigate("/account")} className="text-primary underline">My Account</button>.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded-xl animate-pulse" />
            <div className="h-48 bg-muted rounded-xl animate-pulse" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <Package className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="font-semibold text-red-800 mb-1">Order not found</h3>
              <p className="text-sm text-red-600">No order found with number "{orderNumber}". Please check and try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && !isLoading && (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order #{order.orderNumber}</CardTitle>
                  <Badge className={STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order Date</p>
                    <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">{Number(order.total).toFixed(2)} AED</p>
                  </div>
                  {(order as { trackingNumber?: string }).trackingNumber && (
                    <div>
                      <p className="text-muted-foreground">Tracking #</p>
                      <p className="font-medium font-mono text-xs">{(order as { trackingNumber?: string }).trackingNumber}</p>
                    </div>
                  )}
                  {(order as { estimatedDelivery?: string }).estimatedDelivery && (
                    <div>
                      <p className="text-muted-foreground">Est. Delivery</p>
                      <p className="font-medium">{new Date((order as { estimatedDelivery?: string }).estimatedDelivery!).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Shipping address */}
                {(order as { shippingAddressLine1?: string }).shippingAddressLine1 && (
                  <div className="flex gap-2 pt-2 border-t text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Delivering to</p>
                      <p className="font-medium">{(order as { shippingAddressLine1?: string; shippingCity?: string; shippingEmirate?: string }).shippingAddressLine1}, {(order as { shippingCity?: string }).shippingCity}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Timeline */}
            {order.status !== "cancelled" && order.status !== "refunded" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Delivery Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Progress line */}
                    <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-muted" />
                    <div
                      className="absolute left-5 top-5 w-0.5 bg-primary transition-all duration-500"
                      style={{ height: currentStepIndex >= 0 ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }}
                    />

                    <div className="space-y-6">
                      {STATUS_STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        return (
                          <div key={step.key} className="flex items-start gap-4 relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background z-10 transition-colors ${
                              isCompleted ? "border-primary bg-primary/10" : "border-muted"
                            } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                              <Icon className={`w-4 h-4 ${isCompleted ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div className="pt-1.5">
                              <p className={`font-medium text-sm ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                                {step.label}
                              </p>
                              {isCurrent && (
                                <p className="text-xs text-primary mt-0.5">Current status</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancelled/Refunded state */}
            {(order.status === "cancelled" || order.status === "refunded") && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6 text-center">
                  <p className="font-semibold text-red-800 capitalize">{order.status}</p>
                  <p className="text-sm text-red-600 mt-1">
                    {order.status === "cancelled"
                      ? "This order has been cancelled."
                      : "A refund has been processed for this order."}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Items ({order.items.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.items.map((item: { id: number; productNameEn: string; productNameAr: string; quantity: number; unitPrice: string; totalPrice: string }) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.productNameEn}</p>
                        <p className="text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{(Number(item.unitPrice) * item.quantity).toFixed(2)} AED</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
