import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Shop() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");

  const [search, setSearch] = useState(params.get("search") || "");
  const [searchInput, setSearchInput] = useState(params.get("search") || "");
  const [categorySlug, setCategorySlug] = useState(params.get("category") || "");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "popular">("newest");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isSugarFree, setIsSugarFree] = useState(false);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data, isLoading } = trpc.products.list.useQuery({
    search: search || undefined,
    categorySlug: categorySlug || undefined,
    sortBy,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 500 ? priceRange[1] : undefined,
    isGlutenFree: isGlutenFree || undefined,
    isSugarFree: isSugarFree || undefined,
    page,
    limit: 12,
  });

  // Sync URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
    const cat = urlParams.get("category") || "";
    const q = urlParams.get("search") || "";
    setCategorySlug(cat);
    setSearch(q);
    setSearchInput(q);
    setPage(1);
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategorySlug("");
    setPriceRange([0, 500]);
    setIsGlutenFree(false);
    setIsSugarFree(false);
    setPage(1);
  };

  const hasFilters = search || categorySlug || priceRange[0] > 0 || priceRange[1] < 500 || isGlutenFree || isSugarFree;
  const totalPages = data ? Math.ceil(data.total / 12) : 0;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-[#3E1F00] mb-3">Categories</h3>
        <div className="space-y-2">
          <button
            onClick={() => { setCategorySlug(""); setPage(1); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!categorySlug ? "bg-[#C9A84C] text-white" : "hover:bg-[#F5ECD7] text-[#3E1F00]"}`}
          >
            All Categories
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => { setCategorySlug(cat.slug); setPage(1); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${categorySlug === cat.slug ? "bg-[#C9A84C] text-white" : "hover:bg-[#F5ECD7] text-[#3E1F00]"}`}
            >
              {cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-[#3E1F00] mb-3">Price Range</h3>
        <Slider
          min={0}
          max={500}
          step={10}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>AED {priceRange[0]}</span>
          <span>AED {priceRange[1]}</span>
        </div>
      </div>

      {/* Dietary */}
      <div>
        <h3 className="font-semibold text-[#3E1F00] mb-3">Dietary</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="gluten-free"
              checked={isGlutenFree}
              onCheckedChange={(v) => { setIsGlutenFree(!!v); setPage(1); }}
            />
            <Label htmlFor="gluten-free" className="cursor-pointer text-sm">Gluten Free</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sugar-free"
              checked={isSugarFree}
              onCheckedChange={(v) => { setIsSugarFree(!!v); setPage(1); }}
            />
            <Label htmlFor="sugar-free" className="cursor-pointer text-sm">Sugar Free</Label>
          </div>
        </div>
      </div>

      {hasFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]">
          <X className="h-4 w-4 mr-2" /> Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-[#3E1F00] text-white py-10">
        <div className="container">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            {categorySlug ? categories?.find(c => c.slug === categorySlug)?.nameEn || "Shop" : "Our Products"}
          </h1>
          <p className="text-[#E8D5A3]/80">
            {data ? `${data.total} products available` : "Discover our premium Arabic sweets"}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-xl border border-[#E8D5A3] p-5 sticky top-24">
              <FilterPanel />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search products..."
                    className="pl-9 border-[#E8D5A3] focus:border-[#C9A84C]"
                  />
                </div>
                <Button type="submit" className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
                  Search
                </Button>
              </form>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-40 border-[#E8D5A3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile filter */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden border-[#C9A84C] text-[#C9A84C]">
                    <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
                    {hasFilters && <span className="ml-1 w-2 h-2 bg-[#C9A84C] rounded-full" />}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active filters */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {search && (
                  <span className="inline-flex items-center gap-1 bg-[#F5ECD7] text-[#3E1F00] text-xs px-3 py-1 rounded-full">
                    Search: {search}
                    <button onClick={() => { setSearch(""); setSearchInput(""); }}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {categorySlug && (
                  <span className="inline-flex items-center gap-1 bg-[#F5ECD7] text-[#3E1F00] text-xs px-3 py-1 rounded-full">
                    {categories?.find(c => c.slug === categorySlug)?.nameEn}
                    <button onClick={() => setCategorySlug("")}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {isGlutenFree && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                    Gluten Free <button onClick={() => setIsGlutenFree(false)}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {isSugarFree && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                    Sugar Free <button onClick={() => setIsSugarFree(false)}><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl overflow-hidden border border-[#E8D5A3]">
                    <Skeleton className="aspect-square" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.products.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-[#3E1F00] mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
                <Button onClick={clearFilters} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {data?.products.map((product) => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="border-[#C9A84C] text-[#C9A84C]"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "outline"}
                          onClick={() => setPage(p)}
                          className={page === p ? "bg-[#C9A84C] text-white" : "border-[#C9A84C] text-[#C9A84C]"}
                        >
                          {p}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="border-[#C9A84C] text-[#C9A84C]"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
