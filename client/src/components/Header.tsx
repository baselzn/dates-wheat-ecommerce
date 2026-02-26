import { useAuth } from "@/_core/hooks/useAuth";
import { useCartStore } from "@/stores/cartStore";
import { trpc } from "@/lib/trpc";
import {
  ChevronDown, LogOut, Menu, Package, Search,
  ShoppingBag, User, X, Phone, MapPin, Heart, Settings
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

interface HeaderProps {
  onCartOpen?: () => void;
}

const staticCategories = [
  { name: "Arabic Sweets", nameAr: "حلويات عربية", slug: "arabic-sweets", emoji: "🍯" },
  { name: "Gluten Free",   nameAr: "خالي من الغلوتين", slug: "gluten-free", emoji: "🌿" },
  { name: "Nuts",          nameAr: "مكسرات",           slug: "nuts",        emoji: "🥜" },
  { name: "Arabic Coffee", nameAr: "قهوة عربية",        slug: "arabic-coffee", emoji: "☕" },
  { name: "Gift Boxes",    nameAr: "صناديق هدايا",      slug: "gift-boxes",  emoji: "🎁" },
  { name: "Luxury",        nameAr: "فاخر",              slug: "luxury",      emoji: "✨" },
];

export default function Header({ onCartOpen }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { items } = useCartStore();
  const [, navigate] = useLocation();
  const [location] = useLocation();

  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catOpen, setCatOpen]         = useState(false);
  const [userOpen, setUserOpen]       = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const catRef    = useRef<HTMLDivElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const { data: dbCategories } = trpc.categories.list.useQuery();
  const displayCategories = dbCategories?.length ? dbCategories.map(c => ({
    name: c.nameEn, nameAr: c.nameAr || "", slug: c.slug,
    emoji: staticCategories.find(s => s.slug === c.slug)?.emoji || "🌟",
  })) : staticCategories;

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { logout(); toast.success("Signed out"); navigate("/"); },
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { label: "Home",      href: "/" },
    { label: "Shop",      href: "/shop" },
    { label: "Our Story", href: "/about" },
    { label: "Contact",   href: "/contact" },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="gradient-brown text-white text-xs py-2 hidden md:block">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-5">
            <a href="tel:+97192237070" className="flex items-center gap-1.5 hover:text-[#E8D5A3] transition-colors">
              <Phone className="h-3 w-3" /> +971 9 223 7070
            </a>
            <span className="flex items-center gap-1.5 text-white/70">
              <MapPin className="h-3 w-3" /> Fujairah, UAE
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            <span>🚚 Free shipping on orders over AED 200</span>
            <span className="text-white/40">|</span>
            <span>🌙 Ramadan Special Offers</span>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-[#E8D5A3]"
            : "bg-white border-b border-[#E8D5A3]/60"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-white text-xl">🌴</span>
                </div>
              </div>
              <div>
                <div className="font-bold text-[#3E1F00] text-lg leading-tight group-hover:text-[#C9A84C] transition-colors"
                  style={{ fontFamily: "Playfair Display, serif" }}>
                  Dates &amp; Wheat
                </div>
                <div className="text-[#C9A84C] text-xs leading-tight font-arabic">تمر وقمح</div>
              </div>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? "text-[#C9A84C] bg-[#FFF8F0]"
                      : "text-[#3E1F00] hover:text-[#C9A84C] hover:bg-[#FFF8F0]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Categories Mega Menu */}
              <div ref={catRef} className="relative">
                <button
                  onClick={() => setCatOpen(v => !v)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    catOpen ? "text-[#C9A84C] bg-[#FFF8F0]" : "text-[#3E1F00] hover:text-[#C9A84C] hover:bg-[#FFF8F0]"
                  }`}
                >
                  Categories
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
                </button>

                {catOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#E8D5A3] p-3 animate-scale-in">
                    <div className="grid grid-cols-2 gap-1">
                      {displayCategories.map(cat => (
                        <Link
                          key={cat.slug}
                          href={`/shop?category=${cat.slug}`}
                          onClick={() => setCatOpen(false)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#FFF8F0] group transition-colors"
                        >
                          <span className="text-xl">{cat.emoji}</span>
                          <div>
                            <div className="text-xs font-semibold text-[#3E1F00] group-hover:text-[#C9A84C] transition-colors">
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-arabic">{cat.nameAr}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#E8D5A3]">
                      <Link href="/shop" onClick={() => setCatOpen(false)}
                        className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-[#C9A84C] hover:text-[#9A7A2E] transition-colors">
                        View All Products →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* ── Actions ── */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#3E1F00] hover:text-[#C9A84C] hover:bg-[#FFF8F0] transition-all"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              <Link href="/account?tab=wishlist"
                className="hidden md:flex w-9 h-9 items-center justify-center rounded-xl text-[#3E1F00] hover:text-[#C9A84C] hover:bg-[#FFF8F0] transition-all">
                <Heart className="h-[18px] w-[18px]" />
              </Link>

              {/* User Dropdown */}
              <div ref={userRef} className="relative hidden md:block">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-[#3E1F00] hover:text-[#C9A84C] hover:bg-[#FFF8F0] transition-all"
                >
                  {isAuthenticated ? (
                    <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-white text-xs font-bold">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <User className="h-[18px] w-[18px]" />
                  )}
                </button>

                {userOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-[#E8D5A3] p-2 animate-scale-in">
                    {isAuthenticated ? (
                      <>
                        <div className="px-3 py-2 border-b border-[#E8D5A3] mb-1">
                          <p className="text-xs font-semibold text-[#3E1F00]">{user?.name || "Customer"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</p>
                        </div>
                        <Link href="/account" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#3E1F00] hover:bg-[#FFF8F0] hover:text-[#C9A84C] transition-colors">
                          <Package className="h-4 w-4" /> My Orders
                        </Link>
                        {user?.role === "admin" && (
                          <Link href="/admin" onClick={() => setUserOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#3E1F00] hover:bg-[#FFF8F0] hover:text-[#C9A84C] transition-colors">
                            <Settings className="h-4 w-4" /> Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => { setUserOpen(false); logoutMutation.mutate(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/auth" onClick={() => setUserOpen(false)}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white gradient-gold hover:opacity-90 transition-opacity mb-1">
                          Sign In / Register
                        </Link>
                        <p className="text-center text-[10px] text-muted-foreground px-2">
                          Sign in for order tracking &amp; exclusive offers
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Button */}
              <button
                onClick={onCartOpen}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[#3E1F00] hover:text-[#C9A84C] hover:bg-[#FFF8F0] transition-all"
              >
                <ShoppingBag className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] gradient-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[#3E1F00] hover:bg-[#FFF8F0] transition-all ml-1"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E8D5A3] bg-white">
            <div className="container py-4 space-y-1">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(link.href) ? "text-[#C9A84C] bg-[#FFF8F0]" : "text-[#3E1F00] hover:bg-[#FFF8F0]"
                  }`}>
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-[#E8D5A3]">
                <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
                {displayCategories.map(cat => (
                  <Link key={cat.slug} href={`/shop?category=${cat.slug}`} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#3E1F00] hover:bg-[#FFF8F0] transition-colors">
                    <span>{cat.emoji}</span> {cat.name}
                  </Link>
                ))}
              </div>
              <div className="pt-2 border-t border-[#E8D5A3]">
                {isAuthenticated ? (
                  <>
                    <Link href="/account" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#3E1F00] hover:bg-[#FFF8F0]">
                      <Package className="h-4 w-4 text-[#C9A84C]" /> My Orders
                    </Link>
                    <button onClick={() => { setMobileOpen(false); logoutMutation.mutate(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/auth" onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 mx-4 py-3 rounded-xl text-sm font-semibold text-white gradient-gold">
                    Sign In / Register
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Search Modal ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl animate-scale-in">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#C9A84C]" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for Maamoul, Dates, Gift Boxes..."
                className="w-full pl-14 pr-16 py-5 rounded-2xl bg-white shadow-2xl text-[#3E1F00] text-lg placeholder:text-muted-foreground border-2 border-[#E8D5A3] focus:border-[#C9A84C] focus:outline-none transition-colors"
              />
              <button type="button" onClick={() => setSearchOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5ECD7] text-[#3E1F00] hover:bg-[#E8D5A3] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Maamoul", "Dates Box", "Ramadan Tray", "Gluten Free", "Gift Box"].map(q => (
                <button key={q}
                  onClick={() => { navigate(`/shop?search=${encodeURIComponent(q)}`); setSearchOpen(false); }}
                  className="px-3 py-1.5 rounded-full bg-white/90 text-sm text-[#3E1F00] border border-[#E8D5A3] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
