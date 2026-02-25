import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Award, Gift, Leaf, ShieldCheck, Star, Truck } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: featuredData } = trpc.products.list.useQuery({ isFeatured: true, limit: 8 });
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: newArrivals } = trpc.products.list.useQuery({ limit: 4, sortBy: "newest" });

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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#3E1F00] via-[#6B3A0F] to-[#3E1F00] text-white overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container relative py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-[#C9A84C]/20 text-[#E8D5A3] border-[#C9A84C]/30 mb-4">
                ✨ Premium Arabic Confectionery Since 1990
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
                Taste the <span className="text-[#C9A84C]">Tradition</span> of Arabia
              </h1>
              <p className="text-xl font-arabic text-[#E8D5A3]/90 mb-2" dir="rtl">
                تمر وقمح — أصالة وجودة منذ ١٩٩٠
              </p>
              <p className="text-[#E8D5A3]/80 text-lg mb-8 leading-relaxed">
                Handcrafted Maamoul, Arabic sweets, gluten-free delights, and luxury gift boxes. 
                Made with love in Fujairah, UAE.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold px-8"
                >
                  <Link href="/shop">
                    Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-[#E8D5A3] text-[#E8D5A3] hover:bg-[#E8D5A3]/10 bg-transparent"
                >
                  <Link href="/about">Our Story</Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-10 pt-8 border-t border-[#C9A84C]/20">
                {[
                  { value: "35+", label: "Years of Craft" },
                  { value: "50+", label: "Sweet Varieties" },
                  { value: "10K+", label: "Happy Customers" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-[#C9A84C]">{stat.value}</p>
                    <p className="text-sm text-[#E8D5A3]/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image / decorative */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 rounded-full bg-[#C9A84C]/20 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-[#C9A84C]/10" />
                <div className="absolute inset-0 flex items-center justify-center text-9xl">
                  🍯
                </div>
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-[#C9A84C] text-[#C9A84C]" />
                    <span className="text-sm font-bold text-[#3E1F00]">4.9/5</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Customer Rating</p>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-[#3E1F00]">100% Natural</span>
                  </div>
                  <p className="text-xs text-muted-foreground">No preservatives</p>
                </div>
              </div>
            </div>
          </div>
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
              <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-2">Browse by Category</p>
              <h2 className="text-3xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                Our Collections
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/shop?category=${cat.slug}`}>
                  <div className="group bg-white rounded-xl p-6 border border-[#E8D5A3] hover:border-[#C9A84C] hover:shadow-md transition-all cursor-pointer text-center">
                    <div className="w-14 h-14 rounded-full bg-[#F5ECD7] flex items-center justify-center text-3xl mx-auto mb-3 group-hover:bg-[#E8D5A3] transition-colors">
                      {getCategoryEmoji(cat.slug)}
                    </div>
                    <h3 className="font-semibold text-[#3E1F00] text-sm">{cat.nameEn}</h3>
                    <p className="text-xs text-[#C9A84C] font-arabic mt-1" dir="rtl">{cat.nameAr}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
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
