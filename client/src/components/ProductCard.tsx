import { useCartStore } from "@/stores/cartStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

interface ProductCardProps {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  basePrice: string | number;
  comparePrice?: string | number | null;
  images?: string[];
  isGlutenFree?: boolean;
  isSugarFree?: boolean;
  isFeatured?: boolean;
  stockQty?: number;
  rating?: number;
  reviewCount?: number;
}

export default function ProductCard({
  id,
  slug,
  nameEn,
  nameAr,
  basePrice,
  comparePrice,
  images,
  isGlutenFree,
  isSugarFree,
  isFeatured,
  stockQty = 100,
  rating = 4.5,
  reviewCount = 0,
}: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [wishlist, setWishlist] = useState(false);
  const [adding, setAdding] = useState(false);

  const price = Number(basePrice);
  const compare = comparePrice ? Number(comparePrice) : null;
  const discount = compare && compare > price ? Math.round(((compare - price) / compare) * 100) : null;
  const image = images?.[0];
  const outOfStock = stockQty <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    setAdding(true);
    addItem({
      productId: id,
      productNameEn: nameEn,
      productNameAr: nameAr,
      unitPrice: price,
      quantity: 1,
      slug,
      productImage: image,
    });
    setTimeout(() => {
      setAdding(false);
      openCart();
    }, 400);
  };

  return (
    <Link href={`/product/${slug}`}>
      <div className="product-card group bg-white rounded-xl overflow-hidden border border-[#E8D5A3] cursor-pointer">
        {/* Image */}
        <div className="relative aspect-square bg-[#F5ECD7] overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={nameEn}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🍬</div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5">
                -{discount}%
              </Badge>
            )}
            {isFeatured && (
              <Badge className="bg-[#C9A84C] text-white text-xs px-1.5 py-0.5">
                Featured
              </Badge>
            )}
            {isGlutenFree && (
              <Badge variant="outline" className="bg-white/90 text-green-700 border-green-300 text-xs px-1.5 py-0.5">
                GF
              </Badge>
            )}
            {isSugarFree && (
              <Badge variant="outline" className="bg-white/90 text-blue-700 border-blue-300 text-xs px-1.5 py-0.5">
                SF
              </Badge>
            )}
            {outOfStock && (
              <Badge variant="outline" className="bg-white/90 text-gray-500 border-gray-300 text-xs px-1.5 py-0.5">
                Out of Stock
              </Badge>
            )}
            {!outOfStock && stockQty > 0 && stockQty <= 5 && (
              <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0.5">
                Only {stockQty} left!
              </Badge>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWishlist(!wishlist); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${wishlist ? "fill-red-500 text-red-500" : "text-gray-400"}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-[#3E1F00] text-sm line-clamp-1 mb-0.5">{nameEn}</h3>
          <p className="text-xs text-[#C9A84C] font-arabic line-clamp-1" dir="rtl">{nameAr}</p>

          {/* Rating */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-[#C9A84C] text-[#C9A84C]" />
              <span className="text-xs text-muted-foreground">{rating.toFixed(1)} ({reviewCount})</span>
            </div>
          )}

          {/* Price + Add to cart */}
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-[#3E1F00]">AED {price.toFixed(2)}</span>
              {compare && compare > price && (
                <span className="text-xs text-muted-foreground line-through ml-1">AED {compare.toFixed(2)}</span>
              )}
            </div>
            <Button
              size="icon"
              className={`h-8 w-8 rounded-full transition-all ${
                outOfStock
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : adding
                  ? "bg-green-500 text-white scale-90"
                  : "bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
              }`}
              onClick={handleAddToCart}
              disabled={outOfStock}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
