import Layout from "@/components/Layout";
import ProductQA from "@/components/ProductQA";
import { usePixelTrack } from "@/components/PixelManager";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useCartStore } from "@/stores/cartStore";
import { ChevronLeft, Heart, Minus, Package, Plus, Share2, ShoppingCart, Star, Truck } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = trpc.products.bySlug.useQuery(slug || "");
  const { data: galleryImages } = trpc.admin.products.getImages.useQuery(
    product?.id ?? 0,
    { enabled: !!product?.id }
  );
  const { data: related } = trpc.products.list.useQuery(
    { categoryId: product?.categoryId, limit: 4 },
    { enabled: !!product?.categoryId }
  );
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [wishlist, setWishlist] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-96">
          <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-[#3E1F00] mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-6">This product doesn't exist or has been removed.</p>
          <Button asChild className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
            <Link href="/shop">Back to Shop</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Use gallery images from DB if available, otherwise fall back to product.images array
  const dbImages = galleryImages && galleryImages.length > 0
    ? [
        // Put featured image first
        ...galleryImages.filter(g => g.isFeatured).map(g => g.url),
        ...galleryImages.filter(g => !g.isFeatured).map(g => g.url),
      ]
    : null;
  const images: string[] = dbImages ?? (product.images as string[] | null) ?? [];
  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);
  const price = selectedVariant ? Number(selectedVariant.price) : Number(product.basePrice);
  const comparePrice = selectedVariant?.comparePrice
    ? Number(selectedVariant.comparePrice)
    : product.comparePrice
    ? Number(product.comparePrice)
    : null;
  const discount = comparePrice && comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariantId,
      productNameEn: product.nameEn,
      productNameAr: product.nameAr,
      variantName: selectedVariant?.nameEn,
      unitPrice: price,
      quantity,
      slug: product.slug,
      productImage: images[0],
    });
    toast.success("Added to cart!", { description: `${product.nameEn} × ${quantity}` });
  };

  const avgRating = product.reviews?.length
    ? product.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / product.reviews.length
    : 0;

  return (
    <Layout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-[#C9A84C]">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-[#C9A84C]">Shop</Link>
          <span>/</span>
          <span className="text-[#3E1F00] font-medium">{product.nameEn}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-[#F5ECD7] mb-3">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.nameEn}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🍬</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${selectedImage === i ? "border-[#C9A84C]" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {product.isGlutenFree && <Badge className="bg-green-100 text-green-700 border-green-300">Gluten Free</Badge>}
              {product.isSugarFree && <Badge className="bg-blue-100 text-blue-700 border-blue-300">Sugar Free</Badge>}
              {product.isVegan && <Badge className="bg-purple-100 text-purple-700 border-purple-300">Vegan</Badge>}
              {discount && <Badge className="bg-red-500 text-white">-{discount}% OFF</Badge>}
            </div>

            <h1 className="text-3xl font-bold text-[#3E1F00] mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
              {product.nameEn}
            </h1>
            <p className="text-xl text-[#C9A84C] font-arabic mb-4" dir="rtl">{product.nameAr}</p>

            {/* Rating */}
            {product.reviews && product.reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? "fill-[#C9A84C] text-[#C9A84C]" : "text-gray-200"}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{avgRating.toFixed(1)} ({product.reviews.length} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-[#3E1F00]">AED {price.toFixed(2)}</span>
              {comparePrice && comparePrice > price && (
                <span className="text-lg text-muted-foreground line-through">AED {comparePrice.toFixed(2)}</span>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <p className="font-semibold text-[#3E1F00] mb-2">Size / Weight</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedVariantId(undefined)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${!selectedVariantId ? "bg-[#C9A84C] text-white border-[#C9A84C]" : "border-[#E8D5A3] text-[#3E1F00] hover:border-[#C9A84C]"}`}
                  >
                    Default
                  </button>
                  {product.variants.map((v: { id: number; nameEn: string; price: string; stockQty?: number }) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={(v.stockQty ?? 1) <= 0}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedVariantId === v.id ? "bg-[#C9A84C] text-white border-[#C9A84C]" : (v.stockQty ?? 1) <= 0 ? "border-gray-200 text-gray-400 cursor-not-allowed" : "border-[#E8D5A3] text-[#3E1F00] hover:border-[#C9A84C]"}`}
                    >
                      {v.nameEn} — AED {Number(v.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <p className="font-semibold text-[#3E1F00]">Quantity</p>
              <div className="flex items-center border border-[#E8D5A3] rounded-lg">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuantity(q => q + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <Button
                className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-12"
                onClick={handleAddToCart}
                disabled={(product.stockQty ?? 1) <= 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {(product.stockQty ?? 1) <= 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 border-[#E8D5A3] hover:border-[#C9A84C]"
                onClick={() => setWishlist(!wishlist)}
              >
                <Heart className={`h-5 w-5 ${wishlist ? "fill-red-500 text-red-500" : "text-[#3E1F00]"}`} />
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 border-[#E8D5A3] hover:border-[#C9A84C]">
                <Share2 className="h-5 w-5 text-[#3E1F00]" />
              </Button>
            </div>

            {/* Shipping info */}
            <div className="bg-[#F5ECD7] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#3E1F00]">
                <Truck className="h-4 w-4 text-[#C9A84C]" />
                <span>Free shipping on orders over AED 200</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#3E1F00]">
                <Package className="h-4 w-4 text-[#C9A84C]" />
                <span>Delivered in 2-5 business days across UAE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Description, Reviews */}
        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList className="border-b border-[#E8D5A3] bg-transparent w-full justify-start rounded-none h-auto p-0 gap-0">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#C9A84C] pb-3 px-6"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#C9A84C] pb-3 px-6"
              >
                Reviews ({product.reviews?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="prose prose-sm max-w-none text-[#3E1F00]">
                {product.descriptionEn ? (
                  <p className="leading-relaxed">{product.descriptionEn}</p>
                ) : (
                  <p className="text-muted-foreground">No description available.</p>
                )}
                {product.descriptionAr && (
                  <p className="mt-4 font-arabic text-right leading-relaxed" dir="rtl">{product.descriptionAr}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map((review: { id: number; rating: number; titleEn?: string | null; bodyEn?: string | null; createdAt: Date | string }) => (
                    <div key={review.id} className="bg-white rounded-xl p-5 border border-[#E8D5A3]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-[#C9A84C] text-[#C9A84C]" : "text-gray-200"}`} />
                          ))}
                        </div>
                        {review.titleEn && <span className="font-semibold text-sm text-[#3E1F00]">{review.titleEn}</span>}
                      </div>
                      {review.bodyEn && <p className="text-sm text-[#3E1F00]">{review.bodyEn}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No reviews yet. Be the first to review!</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Product Q&A */}
        <ProductQA productId={product.id} />

        {/* Related Products */}
        {related && related.products.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#3E1F00] mb-6" style={{ fontFamily: "Playfair Display, serif" }}>
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.products.filter((p) => p.id !== product.id).slice(0, 4).map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
