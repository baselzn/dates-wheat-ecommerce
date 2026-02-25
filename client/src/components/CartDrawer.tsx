import { useCartStore } from "@/stores/cartStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useLocation } from "wouter";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getSubtotal, getVat, getShipping, getTotal, discountAmount } = useCartStore();
  const [, navigate] = useLocation();

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-[#E8D5A3]">
          <SheetTitle className="flex items-center gap-2 text-[#3E1F00]">
            <ShoppingBag className="h-5 w-5 text-[#C9A84C]" />
            Shopping Cart
            {items.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-20 h-20 rounded-full bg-[#F5ECD7] flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-[#C9A84C]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#3E1F00]">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Add some delicious treats!</p>
            </div>
            <Button
              onClick={() => { onClose(); navigate("/shop"); }}
              className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg bg-[#F5ECD7] overflow-hidden shrink-0">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productNameEn} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍬</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#3E1F00] line-clamp-1">{item.productNameEn}</p>
                    <p className="text-xs text-[#C9A84C] font-arabic" dir="rtl">{item.productNameAr}</p>
                    {item.variantName && (
                      <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1 border border-[#E8D5A3] rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#3E1F00]">
                          AED {(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.productId, item.variantId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t border-[#E8D5A3] px-6 py-4 space-y-3 bg-[#FFF8F0]">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>AED {getSubtotal().toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>- AED {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span>AED {getVat().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className={getShipping() === 0 ? "text-green-600 font-medium" : ""}>
                    {getShipping() === 0 ? "FREE" : `AED ${getShipping().toFixed(2)}`}
                  </span>
                </div>
                {getShipping() > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add AED {(200 - (getSubtotal() - discountAmount)).toFixed(2)} more for free shipping
                  </p>
                )}
              </div>
              <Separator className="bg-[#E8D5A3]" />
              <div className="flex justify-between font-bold text-[#3E1F00]">
                <span>Total</span>
                <span>AED {getTotal().toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]"
                onClick={() => { onClose(); navigate("/cart"); }}
              >
                View Cart
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
