import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/_core/hooks/useAuth";
import { Grid3X3, LayoutDashboard, ShoppingBag, Store, User } from "lucide-react";
import { Link, useLocation } from "wouter";

interface MobileBottomNavProps {
  onCategoriesOpen?: () => void;
  onCartOpen?: () => void;
}

export default function MobileBottomNav({ onCategoriesOpen, onCartOpen }: MobileBottomNavProps) {
  const [location] = useLocation();
  const { items } = useCartStore();
  const { isAuthenticated, loading } = useAuth();
  // While auth is loading, check localStorage for a previously stored user
  // so the icon doesn't flicker to the login page on every page load.
  const cachedUser = (() => {
    try { return JSON.parse(localStorage.getItem("manus-runtime-user-info") ?? "null"); } catch { return null; }
  })();
  const showAccountLink = isAuthenticated || (loading && !!cachedUser);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <>
      {/* Spacer so page content isn't hidden behind the nav */}
      <div className="md:hidden h-16" />

      {/* Bottom Nav Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8D5A3]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">

          {/* Shop */}
          <Link href="/shop" className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            isActive("/shop") ? "text-[#C9A84C]" : "text-[#3E1F00]/60 hover:text-[#C9A84C]"
          }`}>
            <Store className="h-5 w-5" strokeWidth={isActive("/shop") ? 2 : 1.5} />
            <span className="text-[10px] font-semibold">Shop</span>
            {isActive("/shop") && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#C9A84C]" />
            )}
          </Link>

          {/* Categories */}
          <button
            onClick={onCategoriesOpen}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[#3E1F00]/60 hover:text-[#C9A84C] transition-colors"
          >
            <Grid3X3 className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">Categories</span>
          </button>

          {/* Admin shortcut — only visible to admin users */}
          {isAuthenticated && (cachedUser?.role === "admin") && (
            <Link href="/admin" className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive("/admin") ? "text-[#C9A84C]" : "text-[#3E1F00]/60 hover:text-[#C9A84C]"
            }`}>
              <LayoutDashboard className="h-5 w-5" strokeWidth={isActive("/admin") ? 2 : 1.5} />
              <span className="text-[10px] font-semibold">Admin</span>
              {isActive("/admin") && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#C9A84C]" />
              )}
            </Link>
          )}

          {/* Account */}
          <Link href={showAccountLink ? "/account" : "/auth"} className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            isActive("/account") || isActive("/auth") ? "text-[#C9A84C]" : "text-[#3E1F00]/60 hover:text-[#C9A84C]"
          }`}>
            <User className="h-5 w-5" strokeWidth={isActive("/account") || isActive("/auth") ? 2 : 1.5} />
            <span className="text-[10px] font-semibold">Account</span>
            {(isActive("/account") || isActive("/auth")) && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#C9A84C]" />
            )}
          </Link>

          {/* Cart */}
          <button
            onClick={onCartOpen}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative text-[#3E1F00]/60 hover:text-[#C9A84C] transition-colors"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#C9A84C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Cart</span>
          </button>

        </div>
      </nav>
    </>
  );
}
