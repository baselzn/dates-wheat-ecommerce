import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Search, MapPin, Clock, CheckCircle2, Truck, XCircle, AlertCircle } from "lucide-react";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Preparing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-orange-100 text-orange-800 border-orange-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: order, isLoading, error } = trpc.orders.byNumber.useQuery(searchQuery, {
    enabled: !!searchQuery,
    retry: false,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderNumber.trim().toUpperCase();
    if (trimmed) setSearchQuery(trimmed);
  }

  const currentStep = order ? getStepIndex(order.status) : -1;
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <Package className="w-8 h-8 text-amber-800" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-foreground mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your order number to see the latest status</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-sm border-amber-100">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <Input
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. DW-2024-001234"
                className="flex-1 border-amber-200 focus-visible:ring-amber-500"
              />
              <Button type="submit" className="bg-amber-800 hover:bg-amber-700 text-white px-6" disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? "Searching..." : "Track"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searchQuery && !isLoading && !order && (
          <Card className="border-red-100 bg-red-50/50">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="font-medium text-red-700">Order not found</p>
              <p className="text-sm text-red-500 mt-1">Please check the order number and try again.</p>
            </CardContent>
          </Card>
        )}

        {order && (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="shadow-sm border-amber-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-serif">Order #{order.orderNumber}</CardTitle>
                  <Badge className={`${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"} border font-medium`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Placed on {new Date(order.createdAt).toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </CardHeader>
              <CardContent>
                {/* Progress Tracker */}
                {!isCancelled ? (
                  <div className="relative mb-6">
                    <div className="flex items-center justify-between relative">
                      {/* Progress line */}
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                      <div
                        className="absolute top-5 left-0 h-0.5 bg-amber-600 z-0 transition-all duration-500"
                        style={{ width: currentStep >= 0 ? `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }}
                      />
                      {STATUS_STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div key={step.key} className="flex flex-col items-center z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCompleted
                                ? "bg-amber-700 border-amber-700 text-white"
                                : "bg-white border-gray-300 text-gray-400"
                            } ${isCurrent ? "ring-4 ring-amber-200" : ""}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-xs mt-2 text-center max-w-[60px] leading-tight ${isCompleted ? "text-amber-800 font-medium" : "text-gray-400"}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mb-6 border border-red-100">
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-700">Order Cancelled</p>
                      <p className="text-sm text-red-500">This order has been cancelled.</p>
                    </div>
                  </div>
                )}

                {/* Tracking Number */}
                {order.trackingNumber && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-4 border border-blue-100">
                    <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Tracking Number</p>
                      <p className="font-mono font-semibold text-blue-800">{order.trackingNumber}</p>
                    </div>
                  </div>
                )}

                {/* Shipping Address */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Shipping To</p>
                    <p className="font-medium text-sm">{order.shippingFullName}</p>
                    <p className="text-sm text-muted-foreground">{order.shippingAddressLine1}</p>
                    {order.shippingAddressLine2 && <p className="text-sm text-muted-foreground">{order.shippingAddressLine2}</p>}
                    <p className="text-sm text-muted-foreground">{order.shippingCity}, {order.shippingEmirate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <Card className="shadow-sm border-amber-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-serif">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productNameEn}
                            className="w-14 h-14 rounded-lg object-cover border border-amber-100"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.productNameEn}</p>
                          {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-sm text-amber-800">AED {Number(item.totalPrice).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>AED {Number(order.subtotal).toFixed(2)}</span>
                    </div>
                    {Number(order.discountAmount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-AED {Number(order.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT (5%)</span>
                      <span>AED {Number(order.vatAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span>
                      <span>{Number(order.shippingAmount) === 0 ? "Free" : `AED ${Number(order.shippingAmount).toFixed(2)}`}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-amber-800">AED {Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help note */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Need help with your order? Contact us at{" "}
                <a href="mailto:info@datesandwheat.com" className="underline font-medium">info@datesandwheat.com</a>
                {" "}or call{" "}
                <a href="tel:+97192237070" className="underline font-medium">+971 9 223 7070</a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
