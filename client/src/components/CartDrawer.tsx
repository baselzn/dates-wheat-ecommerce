import { useCartStore } from "@/stores/cartStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, ShoppingBag, Trash2, Truck, Tag, Gift, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const FREE_SHIPPING_THRESHOLD = 200;

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getSubtotal, getVat, getShipping, getTotal, discountAmount } = useCartStore();
  const [, navigate] = useLocation();

  const subtotal = getSubtotal();
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFree = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = () => { onClose(); navigate("/checkout"); };
  const handleViewCart  = () => { onClose(); navigate("/cart"); };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] flex flex-col p-0 border-l border-[#E8D5A3] bg-white"
        style={{ boxShadow: "-20px 0 60px rgba(62,31,0,0.12)" }}
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 py-4 border-b border-[#E8D5A3] bg-white">
          <SheetTitle className="flex items-center gap-3 text-[#3E1F00]">
            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shadow-sm">
              <ShoppingBag className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight" style={{ fontFamily: "Playfair Display, serif" }}>
                Your Cart
              </p>
              <p className="text-xs font-normal text-muted-foreground">
                {itemCount === 0 ? "Empty" : `${itemCount} item${itemCount !== 1 ? "s" : ""}`}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* ── Free Shipping Progress ── */}
        <div className="px-5 py-3 bg-[#FFF8F0] border-b border-[#E8D5A3]">
          {subtotal >= FREE_SHIPPING_THRESHOLD ? (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
              <Truck className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span>🎉 You've unlocked <strong>FREE shipping!</strong></span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-[#3E1F00] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#C9A84C]" />
                  Add <strong className="text-[#C9A84C] mx-0.5">AED {amountToFree.toFixed(0)}</strong> for free shipping
                </span>
                <span className="text-muted-foreground font-medium">{Math.round(shippingProgress)}%</span>
              </div>
              <div className="shipping-progress">
                <div className="shipping-progress-fill" style={{ width: `${shippingProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Items ── */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-24 h-24 rounded-full bg-[#FFF8F0] flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-[#C9A84C]" />
            </div>
            <div>
              <p className="font-bold text-[#3E1F00] text-lg mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                Your cart is empty
              </p>
              <p className="text-sm text-muted-foreground">
                Discover our handcrafted Arabic sweets &amp; gift boxes
              </p>
            </div>
            <button
              onClick={() => { onClose(); navigate("/shop"); }}
              className="btn-gold px-6 py-3 rounded-xl text-sm font-semibold"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId ?? "default"}`}
                  className="flex gap-3 p-3 rounded-2xl bg-[#FFF8F0] border border-[#E8D5A3] group hover:border-[#C9A84C]/40 transition-colors"
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 img-zoom bg-[#E8D5A3]">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productNameEn}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍬</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#3E1F00] truncate leading-tight">
                          {item.productNameEn}
                        </p>
                        {item.productNameAr && (
                          <p className="text-xs text-[#C9A84C] font-arabic leading-tight" dir="rtl">
                            {item.productNameAr}
                          </p>
                        )}
                        {item.variantName && (
                          <span className="inline-block mt-0.5 text-[10px] bg-[#E8D5A3] text-[#3E1F00] px-2 py-0.5 rounded-full font-medium">
                            {item.variantName}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-0.5 bg-white rounded-lg border border-[#E8D5A3] p-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-[#FFF8F0] rounded-md"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-bold text-[#3E1F00]">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-[#FFF8F0] rounded-md"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#3E1F00]">
                          AED {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-muted-foreground">
                            AED {item.unitPrice.toFixed(2)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Upsell hint */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#FFF8F0] to-[#F5ECD7] border border-[#E8D5A3]">
                <Sparkles className="h-4 w-4 text-[#C9A84C] flex-shrink-0" />
                <p className="text-xs text-[#3E1F00]">
                  <strong>Tip:</strong> Add a gift box to make it extra special! 🎁
                </p>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-[#E8D5A3] bg-white px-5 py-4 space-y-3">
              {/* Coupon hint */}
              <div className="flex items-center gap-2 text-xs text-[#C9A84C] bg-[#FFF8F0] rounded-xl px-3 py-2">
                <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Have a coupon code? Apply it at checkout</span>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-[#3E1F00]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">AED {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>− AED {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#3E1F00]">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span className="font-medium">AED {getVat().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#3E1F00]">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className={getShipping() === 0 ? "text-green-600 font-semibold" : "font-medium"}>
                    {getShipping() === 0 ? "FREE 🚚" : `AED ${getShipping().toFixed(2)}`}
                  </span>
                </div>
              </div>

              <Separator className="bg-[#E8D5A3]" />

              <div className="flex justify-between font-bold text-[#3E1F00] text-base">
                <span>Total</span>
                <span className="text-gradient-gold">AED {getTotal().toFixed(2)}</span>
              </div>

              {/* CTAs */}
              <button
                onClick={handleCheckout}
                className="w-full btn-gold py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleViewCart}
                className="w-full py-3 rounded-xl text-sm font-medium text-[#3E1F00] border border-[#E8D5A3] hover:bg-[#FFF8F0] transition-colors"
              >
                View Full Cart
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">🔒 Secure</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">🚚 Fast Delivery</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Gift className="h-3 w-3" /> Gift Wrap
                </span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
