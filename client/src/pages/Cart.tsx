import Layout from "@/components/Layout";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Cart() {
  const {
    items, updateQuantity, removeItem, clearCart,
    getSubtotal, getVat, getShipping, getTotal,
    couponCode, discountAmount, applyCoupon, removeCoupon,
  } = useCartStore();
  const [, navigate] = useLocation();
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const validateCoupon = trpc.coupons.validate.useQuery(
    { code: couponInput, orderAmount: getSubtotal() },
    { enabled: false }
  );

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon.refetch();
      if (result.data?.valid && result.data.discount) {
        applyCoupon(couponInput.toUpperCase(), result.data.discount);
        toast.success("Coupon applied!", { description: `You saved AED ${result.data.discount.toFixed(2)}` });
      } else {
        toast.error(result.data?.message || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-[#F5ECD7] flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-12 w-12 text-[#C9A84C]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3E1F00] mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Start adding some delicious treats!</p>
          <Button asChild className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
            <Link href="/shop">Browse Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#3E1F00] text-white py-8">
        <div className="container">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>Shopping Cart</h1>
          <p className="text-[#E8D5A3]/80 mt-1">{items.reduce((s, i) => s + i.quantity, 0)} items</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-[#3E1F00]">Cart Items</h2>
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive text-xs">
                <Trash2 className="h-3 w-3 mr-1" /> Clear All
              </Button>
            </div>

            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="bg-white rounded-xl p-4 border border-[#E8D5A3] flex gap-4">
                {/* Image */}
                <Link href={`/product/${item.slug}`} className="shrink-0">
                  <div className="w-20 h-20 rounded-lg bg-[#F5ECD7] overflow-hidden">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productNameEn} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍬</div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div>
                      <Link href={`/product/${item.slug}`}>
                        <h3 className="font-semibold text-[#3E1F00] hover:text-[#C9A84C] transition-colors">{item.productNameEn}</h3>
                      </Link>
                      <p className="text-sm text-[#C9A84C] font-arabic" dir="rtl">{item.productNameAr}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-[#E8D5A3] rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#3E1F00]">AED {(item.unitPrice * item.quantity).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">AED {item.unitPrice.toFixed(2)} each</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
              <h3 className="font-semibold text-[#3E1F00] mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#C9A84C]" /> Coupon Code
              </h3>
              {couponCode ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-semibold text-green-700 text-sm">{couponCode}</p>
                    <p className="text-xs text-green-600">Saving AED {discountAmount.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={removeCoupon}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="border-[#E8D5A3] text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  />
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white shrink-0"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
              <h3 className="font-semibold text-[#3E1F00] mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">AED {getSubtotal().toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({couponCode})</span>
                    <span className="font-medium">- AED {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span className="font-medium">AED {getVat().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className={`font-medium ${getShipping() === 0 ? "text-green-600" : ""}`}>
                    {getShipping() === 0 ? "FREE" : `AED ${getShipping().toFixed(2)}`}
                  </span>
                </div>
                {getShipping() > 0 && (
                  <p className="text-xs text-muted-foreground bg-[#F5ECD7] rounded-lg p-2">
                    Add AED {(200 - (getSubtotal() - discountAmount)).toFixed(2)} more for free shipping
                  </p>
                )}
              </div>
              <Separator className="my-4 bg-[#E8D5A3]" />
              <div className="flex justify-between font-bold text-[#3E1F00] text-lg">
                <span>Total</span>
                <span>AED {getTotal().toFixed(2)}</span>
              </div>
              <Button
                className="w-full mt-4 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-12"
                onClick={() => navigate("/checkout")}
              >
                Proceed to Checkout
              </Button>
              <Button
                variant="outline"
                className="w-full mt-2 border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]"
                asChild
              >
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
