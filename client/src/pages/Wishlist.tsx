import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function WishlistPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { addItem } = useCartStore();
  const utils = trpc.useUtils();

  const { data: wishlist, isLoading } = trpc.ecommerce.wishlist.list.useQuery(undefined, {
    enabled: !!user,
  });

  const toggleMutation = trpc.ecommerce.wishlist.toggle.useMutation({
    onSuccess: () => utils.ecommerce.wishlist.list.invalidate(),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view your wishlist</h2>
          <p className="text-muted-foreground mb-6">Save products you love and come back to them later.</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = (item: NonNullable<typeof wishlist>[0]) => {
    let img = "";
    try { img = JSON.parse(item.productImages ?? "[]")[0] ?? ""; } catch { img = ""; }
    addItem({
      productId: item.productId,
      productNameEn: item.productNameEn,
      productNameAr: item.productNameAr,
      productImage: img,
      slug: item.productSlug,
      unitPrice: Number(item.productComparePrice ?? item.productBasePrice),
      quantity: 1,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              My Wishlist
            </h1>
            <p className="text-sm text-muted-foreground">{wishlist?.length ?? 0} saved items</p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        )}

        {!isLoading && (!wishlist || wishlist.length === 0) && (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-6">Browse our products and save your favorites here.</p>
            <Button onClick={() => navigate("/shop")}>Browse Products</Button>
          </div>
        )}

        {!isLoading && wishlist && wishlist.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {wishlist.map((item) => {
              let img = "";
              try { img = JSON.parse(item.productImages ?? "[]")[0] ?? ""; } catch { img = ""; }
              const price = Number(item.productBasePrice);
              const salePrice = item.productComparePrice ? Number(item.productComparePrice) : null;
              return (
                <Card key={item.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                  <div
                    className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                    onClick={() => navigate(`/product/${item.productSlug}`)}
                  >
                    {img ? (
                      <img src={img} alt={item.productNameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🌴</div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ productId: item.productId }); }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <CardContent className="p-3">
                    <h3
                      className="font-medium text-sm line-clamp-2 mb-2 cursor-pointer"
                      onClick={() => navigate(`/product/${item.productSlug}`)}
                    >
                      {item.productNameEn}
                    </h3>
                    {item.productNameAr && (
                      <p className="text-xs text-muted-foreground text-right mb-1" dir="rtl">{item.productNameAr}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        {salePrice ? (
                          <div>
                            <span className="font-bold text-sm text-primary">{salePrice} AED</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">{price} AED</span>
                          </div>
                        ) : (
                          <span className="font-bold text-sm text-primary">{price} AED</span>
                        )}
                      </div>
                      <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => handleAddToCart(item)}>
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
