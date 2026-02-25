import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useCartStore } from "@/stores/cartStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import CartDrawer from "./CartDrawer";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const itemCount = useCartStore((s) => s.getItemCount());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { data: categories } = trpc.categories.list.useQuery();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "Our Story" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-[#3E1F00] text-[#E8D5A3] text-center text-xs py-2 px-4">
        Free shipping on orders over AED 200 · UAE Nationwide Delivery
      </div>

      <header className="bg-white border-b border-[#E8D5A3] sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <Link href="/" onClick={() => setMobileOpen(false)}>
                      <img src="/logo.svg" alt="Dates & Wheat" className="h-10" />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-lg hover:bg-[#F5ECD7] text-[#3E1F00] font-medium transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-2 border-t border-[#E8D5A3] pt-2">
                    <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
                    {categories?.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/shop?category=${cat.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="px-4 py-2 rounded-lg hover:bg-[#F5ECD7] text-[#3E1F00] text-sm transition-colors block"
                      >
                        {cat.nameEn}
                      </Link>
                    ))}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                  Dates & Wheat
                </span>
                <span className="text-xs text-[#C9A84C] font-arabic" dir="rtl">تمر وقمح</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-lg hover:bg-[#F5ECD7] text-[#3E1F00] font-medium text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {categories && categories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-[#3E1F00] font-medium text-sm gap-1 hover:bg-[#F5ECD7]">
                      Categories <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {categories.map((cat) => (
                      <DropdownMenuItem key={cat.slug} asChild>
                        <Link href={`/shop?category=${cat.slug}`} className="cursor-pointer">
                          {cat.nameEn}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-48 h-8 text-sm border-[#C9A84C]"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
                  <Search className="h-5 w-5 text-[#3E1F00]" />
                </Button>
              )}

              {/* Auth */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5 text-[#3E1F00]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user?.name || "My Account"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || user?.phone}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" /> My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders" className="cursor-pointer">
                        <Package className="h-4 w-4 mr-2" /> My Orders
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer text-[#C9A84C] font-medium">
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/auth")}
                >
                  <User className="h-5 w-5 text-[#3E1F00]" />
                </Button>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingBag className="h-5 w-5 text-[#3E1F00]" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C9A84C] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
