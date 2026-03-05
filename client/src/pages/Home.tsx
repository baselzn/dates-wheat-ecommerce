import Layout from "@/components/Layout";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Award, ChevronRight, Gift, Leaf, ShieldCheck, Star, Truck, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { usePixelTrack } from "@/components/PixelManager";

// ─── Flash Sale Banner ─────────────────────────────────────────────────────────
type FlashSaleProduct = {
  id: number;
  productId: number;
  productNameEn: string;
  productNameAr: string | null;
  productBasePrice: string;
  productSlug: string;
  saleName: string;
  discountType: string;
  discountValue: string;
  salePrice: string;
  endsAt: Date | string;
};

function useCountdown(endsAt: Date | string) {
  const getRemaining = () => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0 };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s };
  };
  const [time, setTime] = useState(getRemaining);
  useEffect(() => {
    const t = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return time;
}

function FlashSaleBanner({ sale }: { sale: FlashSaleProduct }) {
  const { h, m, s } = useCountdown(sale.endsAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const isExpired = h === 0 && m === 0 && s === 0;
  if (isExpired) return null;
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A0A00 0%, #7B1D1D 50%, #1A0A00 100%)" }}>
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='1'%3E%3Cpath d='M30 0L37 7L30 14L23 7L30 0ZM30 46L37 53L30 60L23 53L30 46ZM0 30L7 23L14 30L7 37L0 30ZM46 30L53 23L60 30L53 37L46 30Z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="container py-6 relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0 animate-pulse">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-red-400">Flash Sale</span>
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 border-0">LIVE</Badge>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "Playfair Display, serif" }}>
                {sale.saleName}
              </h3>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <span className="text-[#E8D5A3]/70 text-sm mr-1">Ends in</span>
            {[[pad(h), "HRS"], [pad(m), "MIN"], [pad(s), "SEC"]].map(([val, lbl]) => (
              <div key={lbl} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-black/40 border border-[#C9A84C]/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-white tabular-nums">{val}</span>
                </div>
                <span className="text-[10px] text-[#E8D5A3]/60 mt-0.5 tracking-widest">{lbl}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link href="/flash-sales">
            <Button className="bg-red-500 hover:bg-red-600 text-white font-bold gap-2 px-6 shadow-lg shadow-red-900/30">
              <Zap className="w-4 h-4 fill-white" /> Shop Flash Sale
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { track } = usePixelTrack();
  useEffect(() => { track("PageView", { page_path: "/", page_title: "Home" }); }, []);
  const { data: featuredData } = trpc.products.list.useQuery({ isFeatured: true, limit: 8 });
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: newArrivals } = trpc.products.list.useQuery({ limit: 4, sortBy: "newest" });
  const { data: flashSalesData } = trpc.ecommerce.flashSales.active.useQuery();
  const activeSale = flashSalesData?.[0]; // Show first active flash sale

  const features = [
    { icon: <Award className="h-6 w-6" />, title: "Premium Quality", desc: "Handcrafted with finest ingredients" },
    { icon: <Leaf className="h-6 w-6" />, title: "Natural Ingredients", desc: "No artificial preservatives" },
    { icon: <Truck className="h-6 w-6" />, title: "UAE Delivery", desc: "Free shipping over AED 200" },
    { icon: <Gift className="h-6 w-6" />, title: "Gift Packaging", desc: "Luxury gift boxes available" },
  ];

  const testimonials = [
    { name: "Fatima Al Rashid", rating: 5, text: "The Maamoul is absolutely divine! Reminds me of my grandmother's recipe. Best Arabic sweets in UAE.", location: "Dubai" },
    { name: "Ahmed Hassan", rating: 5, text: "Ordered for Eid gifts and everyone loved them. The packaging is beautiful and the taste is authentic.", location: "Abu Dhabi" },
    { name: "Sarah Mohammed", rating: 5, text: "The gluten-free options are amazing! Finally I can enjoy Arabic sweets without worry.", location: "Sharjah" },
  ];

  return (
    <Layout>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A0A00 0%, #3E1F00 45%, #5C2D0A 100%)" }}>
        {/* Decorative Arabic pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='1'%3E%3Cpath d='M40 0L50 10L40 20L30 10L40 0ZM40 60L50 70L40 80L30 70L40 60ZM0 40L10 30L20 40L10 50L0 40ZM60 40L70 30L80 40L70 50L60 40Z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        {/* Gold accent line at top */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, transparent, #C9A84C, #E8C76A, #C9A84C, transparent)" }} />
        <div className="container relative py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
                <span className="text-[#E8D5A3] text-sm font-medium">Premium Arabic Confectionery Since 1990</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                Taste the <br />
                <span style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C76A 50%, #C9A84C 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Tradition
                </span>
                {" "}of Arabia
              </h1>
              <p className="text-xl font-arabic text-[#E8D5A3]/90 mb-3 leading-relaxed" dir="rtl">
                تمر وقمح — أصالة وجودة منذ ١٩٩٠
              </p>
              <p className="text-[#E8D5A3]/75 text-lg mb-8 leading-relaxed max-w-lg">
                Handcrafted Maamoul, Arabic sweets, gluten-free delights, and luxury gift boxes.
                Made with love in Fujairah, UAE.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg"
                  className="text-[#3E1F00] font-bold px-8 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E8C76A, #C9A84C)" }}>
                  <Link href="/shop">
                    Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline"
                  className="border-[#C9A84C]/50 text-[#E8D5A3] hover:bg-[#C9A84C]/10 hover:border-[#C9A84C] transition-all bg-transparent">
                  <Link href="/about">Our Story</Link>
                </Button>
              </div>
              <div className="flex gap-8 mt-10 pt-8 border-t border-white/10">
                {[
                  { value: "35+", label: "Years of Tradition" },
                  { value: "50+", label: "Unique Products" },
                  { value: "10K+", label: "Happy Customers" },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-[#C9A84C]">{stat.value}</p>
                    <p className="text-xs text-[#E8D5A3]/60 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative">
                <div className="w-80 h-80 mx-auto rounded-full overflow-hidden border-4 border-[#C9A84C]/30 shadow-2xl"
                  style={{ boxShadow: "0 0 80px rgba(201,168,76,0.3)" }}>
                  <img
                    src="https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600"
                    alt="Premium Arabic Sweets"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-4 -left-4 bg-white rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
                  <span className="text-2xl">🍯</span>
                  <div>
                    <p className="text-xs font-bold text-[#3E1F00]">Maamoul</p>
                    <p className="text-[10px] text-[#C9A84C]">Best Seller</p>
                  </div>
                </div>
                <div className="absolute bottom-8 -right-4 bg-white rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  <div>
                    <p className="text-xs font-bold text-[#3E1F00]">Gift Boxes</p>
                    <p className="text-[10px] text-[#C9A84C]">From AED 85</p>
                  </div>
                </div>
                <div className="absolute top-1/2 -right-8 bg-[#C9A84C] rounded-xl px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white text-white" />
                    <span className="text-xs font-bold text-white">4.9/5</span>
                  </div>
                  <p className="text-[10px] text-white/80">1,200+ reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-12 relative overflow-hidden">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full">
            <path d="M0 48L60 40C120 32 240 16 360 12C480 8 600 16 720 20C840 24 960 24 1080 20C1200 16 1320 8 1380 4L1440 0V48H1380C1320 48 1200 48 1080 48C960 48 840 48 720 48C600 48 480 48 360 48C240 48 120 48 60 48H0Z" fill="#FFF8F0"/>
          </svg>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-white border-b border-[#E8D5A3]">
        <div className="container py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-[#F5ECD7] flex items-center justify-center text-[#C9A84C] shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-[#3E1F00] text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-16 bg-[#FFF8F0]">
          <div className="container">
            <div className="text-center mb-10">
              <Badge className="bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20 mb-3">Browse Categories</Badge>
              <h2 className="text-3xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                Explore Our Collection
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.slice(0, 8).map((cat) => (
                <Link key={cat.slug} href={`/shop/category/${cat.slug}`}>
                  <div className="group relative overflow-hidden rounded-2xl aspect-square cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ background: "linear-gradient(135deg, #3E1F00, #6B3A0F)" }}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.nameEn} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">{getCategoryEmoji(cat.slug)}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-bold text-sm">{cat.nameEn}</p>
                      {cat.nameAr && <p className="text-[#E8D5A3]/80 text-xs font-arabic mt-0.5" dir="rtl">{cat.nameAr}</p>}
                    </div>
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-3 w-3 text-[#C9A84C]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Flash Sales Banner — only shown when a sale is active */}
      {activeSale && (
        <FlashSaleBanner sale={activeSale} />
      )}

      {/* Featured Products */}
      {featuredData && featuredData.products.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-2">Handpicked for You</p>
                <h2 className="text-3xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                  Featured Products
                </h2>
              </div>
              <Button asChild variant="outline" className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]">
                <Link href="/shop">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredData.products.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Banner */}
      <section className="py-16 bg-gradient-to-r from-[#3E1F00] to-[#6B3A0F]">
        <div className="container text-center text-white">
          <p className="text-[#C9A84C] font-arabic text-2xl mb-3" dir="rtl">هدية من القلب</p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
            The Perfect Gift for Every Occasion
          </h2>
          <p className="text-[#E8D5A3]/80 max-w-xl mx-auto mb-8">
            From Eid celebrations to corporate gifting, our luxury gift boxes are crafted to impress. 
            Customization available for bulk orders.
          </p>
          <Button asChild size="lg" className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold px-8">
            <Link href="/shop?category=gift-boxes">
              Explore Gift Boxes <Gift className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals && newArrivals.products.length > 0 && (
        <section className="py-16 bg-[#FFF8F0]">
          <div className="container">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-2">Just Arrived</p>
                <h2 className="text-3xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                  New Arrivals
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {newArrivals.products.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-2">What Customers Say</p>
            <h2 className="text-3xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
              Loved by Thousands
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[#FFF8F0] rounded-xl p-6 border border-[#E8D5A3]">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#C9A84C] text-[#C9A84C]" />
                  ))}
                </div>
                <p className="text-[#3E1F00] text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#C9A84C] flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-[#3E1F00] text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewedSection limit={6} />

      {/* WhatsApp CTA */}
      <a
        href="https://wa.me/97192237070"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        title="Chat on WhatsApp"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </Layout>
  );
}

function getCategoryEmoji(slug: string): string {
  const map: Record<string, string> = {
    "arabic-sweets": "🍮",
    "gluten-free": "🌾",
    "free-sugar": "🍃",
    "cold-sweets": "🧊",
    "nuts": "🥜",
    "arabic-coffee": "☕",
    "gift-boxes": "🎁",
    "luxury": "✨",
  };
  return map[slug] || "🍬";
}
