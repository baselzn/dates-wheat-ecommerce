import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Clock, ShoppingCart, ArrowLeft, Heart } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

function Countdown({ endsAt }: { endsAt: string | Date }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1 text-sm font-mono font-bold">
      <Clock className="w-3.5 h-3.5 text-red-500" />
      <span className="text-red-600">{pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}</span>
    </div>
  );
}

export default function FlashSalesPage() {
  const [, navigate] = useLocation();
  const { addItem } = useCartStore();

  const { data: flashSales, isLoading } = trpc.ecommerce.flashSales.active.useQuery();

  const handleAddToCart = (product: {
    productId: number;
    productNameEn: string;
    productNameAr: string;
    productImages: string | null;
    productSlug: string;
    salePrice: string | number;
  }) => {
    let img = "";
    try { img = JSON.parse(product.productImages ?? "[]")[0] ?? ""; } catch { img = ""; }
    addItem({
      productId: product.productId,
      productNameEn: product.productNameEn,
      productNameAr: product.productNameAr,
      productImage: img,
      slug: product.productSlug,
      unitPrice: Number(product.salePrice),
      quantity: 1,
    });
    toast.success("Added to cart!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-white/80 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 fill-yellow-300 text-yellow-300" />
            <h1 className="text-3xl font-bold">Flash Sales</h1>
            <Zap className="w-8 h-8 fill-yellow-300 text-yellow-300" />
          </div>
          <p className="text-white/80">Limited-time deals — grab them before they're gone!</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        )}

        {!isLoading && (!flashSales || flashSales.length === 0) && (
          <div className="text-center py-20">
            <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active flash sales right now</h3>
            <p className="text-muted-foreground mb-6">Check back soon for exclusive limited-time deals.</p>
            <Button onClick={() => navigate("/shop")}>Browse All Products</Button>
          </div>
        )}

        {!isLoading && flashSales && flashSales.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {flashSales.map((sale) => {
              let img = "";
              try { img = JSON.parse(sale.productImages ?? "[]")[0] ?? ""; } catch { img = ""; }
              const original = Number(sale.productBasePrice);
              const salePrice = Number(sale.salePrice);
              const discount = Math.round(((original - salePrice) / original) * 100);
              return (
                <Card key={sale.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                  <div
                    className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                    onClick={() => navigate(`/product/${sale.productSlug}`)}
                  >
                    {img ? (
                      <img src={img} alt={sale.productNameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🌴</div>
                    )}
                    {/* Discount badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-red-500 text-white font-bold text-xs px-1.5">-{discount}%</Badge>
                    </div>

                  </div>
                  <CardContent className="p-3">
                    <h3
                      className="font-medium text-sm line-clamp-2 mb-1 cursor-pointer"
                      onClick={() => navigate(`/product/${sale.productSlug}`)}
                    >
                      {sale.productNameEn}
                    </h3>
                    {/* Countdown */}
                    {sale.endsAt && (
                      <div className="mb-2">
                        <Countdown endsAt={sale.endsAt} />
                      </div>
                    )}
                    {/* Pricing */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-red-600">{salePrice.toFixed(2)} AED</span>
                        <span className="text-xs text-muted-foreground line-through ml-1">{original.toFixed(2)}</span>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 bg-red-500 hover:bg-red-600"
                        onClick={() => handleAddToCart(sale)}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        Add
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
