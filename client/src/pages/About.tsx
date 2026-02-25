import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, Heart, Leaf, MapPin, Phone, Star, Users } from "lucide-react";

const milestones = [
  { year: "1990", title: "Founded in Fujairah", desc: "Ms. Najwa Alananni started crafting traditional Arabic sweets from her home kitchen in Fujairah, UAE." },
  { year: "2000", title: "First Storefront", desc: "Growing demand led to opening the first dedicated shop, bringing handcrafted Maamoul and Arabic sweets to the community." },
  { year: "2010", title: "Gluten-Free Range", desc: "Responding to health-conscious customers, we launched our celebrated gluten-free and free-sugar confectionery line." },
  { year: "2018", title: "Luxury Gift Boxes", desc: "Our premium gift box collections became the go-to choice for Ramadan, Eid, and corporate gifting across the UAE." },
  { year: "2024", title: "Online Store", desc: "Bringing the taste of tradition to every doorstep — UAE-wide delivery with the same handcrafted quality." },
];

const values = [
  { icon: Heart, title: "Made with Love", desc: "Every piece is handcrafted using time-honoured recipes passed down through generations." },
  { icon: Leaf, title: "Natural Ingredients", desc: "We use only the finest natural ingredients — no artificial preservatives, no shortcuts." },
  { icon: Award, title: "Uncompromising Quality", desc: "Over 35 years of perfecting our craft means every bite meets the highest standard." },
  { icon: Users, title: "Community First", desc: "Rooted in Fujairah, we take pride in supporting local suppliers and celebrating UAE heritage." },
];

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-[#3E1F00] text-white py-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1571167366136-b57e37b56dc5?w=1400&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30 text-sm">
            Since 1990 · منذ ١٩٩٠
          </Badge>
          <h1 className="font-playfair text-5xl md:text-6xl font-bold mb-6">Our Story</h1>
          <p className="text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
            Three decades of handcrafting premium Arabic sweets with love, tradition, and the finest natural ingredients — right here in Fujairah, UAE.
          </p>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-20 bg-[#FFF8F0]">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Badge className="mb-4 bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20">The Founder</Badge>
            <h2 className="font-playfair text-4xl font-bold text-[#3E1F00] mb-6">
              A Passion Born in the Kitchen
            </h2>
            <p className="text-[#3E1F00]/70 leading-relaxed mb-4">
              In 1990, Ms. Najwa Alananni began her journey in a modest kitchen in Fujairah, driven by a deep love for Arabic culinary heritage. What started as sharing homemade Maamoul with neighbours quickly grew into something far greater.
            </p>
            <p className="text-[#3E1F00]/70 leading-relaxed mb-4">
              Her philosophy was simple: use only the best natural ingredients, never rush the process, and pour genuine care into every piece. That philosophy has not changed in over 35 years.
            </p>
            <p className="text-[#3E1F00]/70 leading-relaxed">
              Today, Dates & Wheat is a beloved name across the UAE — trusted for Ramadan trays, Eid gift boxes, corporate hampers, and everyday indulgence. Yet every product still carries the same handcrafted soul it always has.
            </p>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop"
                alt="Arabic sweets craftsmanship"
                className="w-full h-96 object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#C9A84C] text-white rounded-2xl p-6 shadow-xl">
              <div className="text-4xl font-bold font-playfair">35+</div>
              <div className="text-sm opacity-90">Years of Craft</div>
            </div>
            <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 shadow-xl border border-[#F5ECD7]">
              <div className="flex items-center gap-2 text-[#C9A84C]">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-bold text-lg">4.9/5</span>
              </div>
              <div className="text-xs text-[#3E1F00]/60">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20">What We Stand For</Badge>
            <h2 className="font-playfair text-4xl font-bold text-[#3E1F00]">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-2xl bg-[#FFF8F0] border border-[#F5ECD7] hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-[#C9A84C]" />
                </div>
                <h3 className="font-semibold text-[#3E1F00] mb-2">{title}</h3>
                <p className="text-sm text-[#3E1F00]/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-[#FFF8F0]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20">Our Journey</Badge>
            <h2 className="font-playfair text-4xl font-bold text-[#3E1F00]">Milestones</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#C9A84C]/30 hidden md:block" />
            <div className="space-y-10">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-8 items-start">
                  <div className="flex-shrink-0 w-16 h-16 bg-[#C9A84C] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg z-10">
                    {m.year}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#F5ECD7]">
                    <h3 className="font-semibold text-[#3E1F00] text-lg mb-1">{m.title}</h3>
                    <p className="text-[#3E1F00]/60 text-sm leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#3E1F00] text-white">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "35+", label: "Years of Craft" },
            { value: "50+", label: "Sweet Varieties" },
            { value: "10K+", label: "Happy Customers" },
            { value: "UAE", label: "Nationwide Delivery" },
          ].map(s => (
            <div key={s.label}>
              <div className="font-playfair text-4xl font-bold text-[#C9A84C] mb-1">{s.value}</div>
              <div className="text-white/70 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="py-16 bg-[#FFF8F0]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20">Find Us</Badge>
          <h2 className="font-playfair text-3xl font-bold text-[#3E1F00] mb-8">Visit Our Store</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#F5ECD7] inline-block text-left">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-[#C9A84C] mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-[#3E1F00]">Fujairah – Madab – Front KM Trading</div>
                <div className="text-[#3E1F00]/60 text-sm">Fujairah, United Arab Emirates</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#C9A84C] flex-shrink-0" />
              <a href="tel:+97192237070" className="text-[#3E1F00] hover:text-[#C9A84C] transition-colors font-medium">
                +971 9 223 7070
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
