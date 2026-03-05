import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Search, SlidersHorizontal, X, ShoppingCart, Heart, Star } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sortBy, setSortBy] = useState<"relevance" | "price_asc" | "price_desc" | "newest" | "rating">("relevance");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 350);
  const { addItem } = useCartStore();

  const { data: categories } = trpc.categories.list.useQuery();
  const { data, isLoading } = trpc.products.list.useQuery({
    search: debouncedQuery || undefined,
    categoryId,
    page,
    limit: 20,
  });

  const wishlistMutation = trpc.ecommerce.wishlist.toggle.useMutation({
    onSuccess: () => toast.success("Wishlist updated"),
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Filter and sort client-side for price range and sort (server doesn't support all)
  const filtered = products
    .filter(p => {
      const price = Number(p.comparePrice ?? p.basePrice);
      return price >= priceRange[0] && price <= priceRange[1];
    })
    .sort((a, b) => {
      const pa = Number(a.comparePrice ?? a.basePrice);
      const pb = Number(b.comparePrice ?? b.basePrice);
      if (sortBy === "price_asc") return pa - pb;
      if (sortBy === "price_desc") return pb - pa;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

  useEffect(() => {
    const url = debouncedQuery ? `/search?q=${encodeURIComponent(debouncedQuery)}` : "/search";
    window.history.replaceState(null, "", url);
    setPage(1);
  }, [debouncedQuery]);

  const handleAddToCart = (product: typeof products[0]) => {
    const salePrice = product.comparePrice ? Number(product.comparePrice) : null;
    const images = (() => { try { return JSON.parse(product.images as unknown as string ?? "[]"); } catch { return []; } })();
    addItem({
      productId: product.id,
      productNameEn: product.nameEn,
      productNameAr: product.nameAr,
      productImage: images[0],
      unitPrice: salePrice ?? Number(product.basePrice),
      quantity: 1,
      slug: product.slug,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10 pr-10 h-11 text-base"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2 h-11">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Select value={categoryId?.toString() ?? "all"} onValueChange={(v) => setCategoryId(v === "all" ? undefined : Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sort by</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Price: {priceRange[0]} – {priceRange[1]} AED
                </label>
                <Slider
                  min={0} max={1000} step={10}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Active filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            {categoryId && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCategoryId(undefined)}>
                {categories?.find(c => c.id === categoryId)?.nameEn} <X className="w-3 h-3" />
              </Badge>
            )}
            {sortBy !== "relevance" && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSortBy("relevance")}>
                {sortBy.replace("_", " ")} <X className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Searching..." : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}${debouncedQuery ? ` for "${debouncedQuery}"` : ""}`}
          </p>
          {!showFilters && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low → High</SelectItem>
                <SelectItem value="price_desc">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {debouncedQuery ? `No results for "${debouncedQuery}". Try a different search term.` : "Start typing to search for products."}
            </p>
            <Button variant="outline" onClick={() => { setQuery(""); setCategoryId(undefined); }}>Clear filters</Button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const images = (() => { try { return JSON.parse(product.images as unknown as string ?? "[]"); } catch { return []; } })();
              const image = images[0];
              const price = Number(product.basePrice);
              const salePrice = product.comparePrice ? Number(product.comparePrice) : null;
              const discount = salePrice ? Math.round((1 - salePrice / price) * 100) : 0;
              return (
                <Card key={product.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="relative aspect-square overflow-hidden bg-muted" onClick={() => navigate(`/product/${product.slug}`)}>
                    {image ? (
                      <img src={image} alt={product.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">🌴</div>
                    )}
                    {discount > 0 && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">-{discount}%</Badge>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); wishlistMutation.mutate({ productId: product.id }); }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1 leading-snug" onClick={() => navigate(`/product/${product.slug}`)}>
                      {product.nameEn}
                    </h3>
                    {product.nameAr && (
                      <p className="text-xs text-muted-foreground text-right mb-1" dir="rtl">{product.nameAr}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-2">
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
                      <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => handleAddToCart(product)}>
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

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
