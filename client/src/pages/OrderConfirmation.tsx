import Layout from "@/components/Layout";
import { usePixelTrack } from "@/components/PixelManager";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Package, Truck } from "lucide-react";
import { Link, useParams } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function OrderConfirmation() {
  const { track } = usePixelTrack();
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data: order, isLoading } = trpc.orders.byNumber.useQuery(orderNumber || "");
  useEffect(() => {
    if (order) {
      track("Purchase", {
        value: Number(order.total),
        currency: "AED",
        num_items: order.items?.length || 0,
        order_id: order.orderNumber,
        content_ids: order.items?.map((i: { productId: number }) => String(i.productId)) || [],
      });
    }
  }, [order?.id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold text-[#3E1F00]">Order not found</h2>
          <Button asChild className="mt-4 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 max-w-2xl mx-auto">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#3E1F00] mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground">
            Thank you for your order. We'll prepare it with care and love.
          </p>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-[#E8D5A3] overflow-hidden">
          {/* Header */}
          <div className="bg-[#F5ECD7] px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="font-bold text-[#3E1F00] text-lg">{order.orderNumber}</p>
            </div>
            <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          <div className="p-6 space-y-6">
            {/* Items */}
            <div>
              <h3 className="font-semibold text-[#3E1F00] mb-3">Items Ordered</h3>
              <div className="space-y-3">
                {order.items?.map((item: {
                  id: number;
                  productNameEn: string;
                  productNameAr: string;
                  variantName?: string | null;
                  quantity: number;
                  unitPrice: string;
                  totalPrice: string;
                  productImage?: string | null;
                }) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#F5ECD7] overflow-hidden shrink-0">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productNameEn} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍬</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#3E1F00]">{item.productNameEn}</p>
                      <p className="text-xs font-arabic text-[#C9A84C]" dir="rtl">{item.productNameAr}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#3E1F00]">AED {Number(item.totalPrice).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-[#E8D5A3]" />

            {/* Pricing */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>AED {Number(order.subtotal).toFixed(2)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- AED {Number(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (5%)</span>
                <span>AED {Number(order.vatAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={Number(order.shippingAmount) === 0 ? "text-green-600" : ""}>
                  {Number(order.shippingAmount) === 0 ? "FREE" : `AED ${Number(order.shippingAmount).toFixed(2)}`}
                </span>
              </div>
              <Separator className="bg-[#E8D5A3]" />
              <div className="flex justify-between font-bold text-[#3E1F00] text-base">
                <span>Total Paid</span>
                <span>AED {Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            <Separator className="bg-[#E8D5A3]" />

            {/* Shipping address */}
            <div>
              <h3 className="font-semibold text-[#3E1F00] mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#C9A84C]" /> Shipping Address
              </h3>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-[#3E1F00]">{order.shippingFullName}</p>
                <p>{order.shippingAddressLine1}</p>
                {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
                <p>{order.shippingCity ? `${order.shippingCity}, ` : ""}{order.shippingEmirate}</p>
                <p>{order.shippingPhone}</p>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <h3 className="font-semibold text-[#3E1F00] mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-[#C9A84C]" /> Payment Method
              </h3>
              <p className="text-sm text-muted-foreground">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : "Credit / Debit Card"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button asChild className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]">
            <Link href="/account/orders">View All Orders</Link>
          </Button>
        </div>

        {/* WhatsApp support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help with your order?{" "}
            <a href="https://wa.me/97192237070" target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] hover:underline font-medium">
              Chat with us on WhatsApp
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
