import Header from "./Header";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import MobileBottomNav from "./MobileBottomNav";
import { PushNotificationPrompt } from "./PushNotificationPrompt";
import PWAInstallBanner from "./PWAInstallBanner";
import { useCartStore } from "@/stores/cartStore";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const categoryEmojis: Record<string, string> = {
  "arabic-sweets": "🍯",
  "gluten-free": "🌿",
  "nuts": "🥜",
  "arabic-coffee": "☕",
  "gift-boxes": "🎁",
  "luxury": "✨",
  "dates": "🌴",
  "chocolate": "🍫",
};

export default function Layout({ children, hideFooter }: LayoutProps) {
  const { isCartOpen, openCart, closeCart } = useCartStore();
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const { data: categories } = trpc.categories.list.useQuery();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8F0]">
      {/* Android PWA install banner — sits above the header */}
      <PWAInstallBanner />
      <Header onCartOpen={openCart} />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={closeCart} />

      {/* Mobile Categories Bottom Sheet */}
      {catDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCatDrawerOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E8D5A3]">
              <h2 className="text-lg font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                Browse Categories
              </h2>
              <button
                onClick={() => setCatDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5ECD7] text-[#3E1F00]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 pb-8">
              {(categories || []).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/shop?category=${cat.slug}`}
                  onClick={() => setCatDrawerOpen(false)}
                >
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-[#E8D5A3] hover:border-[#C9A84C] hover:bg-[#FFF8F0] active:bg-[#F5ECD7] transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-[#F5ECD7] flex items-center justify-center text-xl shrink-0">
                      {categoryEmojis[cat.slug] || "🌟"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#3E1F00] truncate">{cat.nameEn}</p>
                      {cat.nameAr && (
                        <p className="text-xs text-[#C9A84C] font-arabic truncate" dir="rtl">{cat.nameAr}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/shop" onClick={() => setCatDrawerOpen(false)} className="col-span-2">
                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#3E1F00] text-white font-semibold text-sm">
                  View All Products →
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onCategoriesOpen={() => setCatDrawerOpen(true)}
        onCartOpen={openCart}
      />

      {/* Push Notification Permission Prompt */}
      <PushNotificationPrompt />
    </div>
  );
}
