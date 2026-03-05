import { useState, useEffect } from "react";
import { getRecentlyViewed, type RecentlyViewedProduct } from "@/hooks/useRecentlyViewed";
import ProductCard from "@/components/ProductCard";
import { Clock } from "lucide-react";

interface RecentlyViewedSectionProps {
  /** Exclude a specific product ID (e.g. the current product page) */
  excludeId?: number;
  /** Max number of items to show */
  limit?: number;
}

export default function RecentlyViewedSection({ excludeId, limit = 8 }: RecentlyViewedSectionProps) {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    const all = getRecentlyViewed();
    const filtered = excludeId ? all.filter((p) => p.id !== excludeId) : all;
    setProducts(filtered.slice(0, limit));
  }, [excludeId, limit]);

  if (products.length === 0) return null;

  return (
    <section className="py-10 bg-[#FFF8F0]">
      <div className="container">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="h-5 w-5 text-[#C9A84C]" />
          <h2 className="text-xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
            Recently Viewed
          </h2>
        </div>
        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible scrollbar-hide">
          {products.map((product) => (
            <div key={product.id} className="shrink-0 w-44 md:w-auto">
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
