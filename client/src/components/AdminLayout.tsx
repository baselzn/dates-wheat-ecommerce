import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Box, ChevronRight, Home, LayoutDashboard, LogOut,
  Package, Radio, Settings, ShoppingCart, Tag, Users, Warehouse
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Box },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Tracking", href: "/admin/tracking", icon: Radio },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5ECD7]">
        <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="min-h-screen flex bg-[#F5ECD7]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#3E1F00] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C9A84C] flex items-center justify-center text-lg">🍯</div>
            <div>
              <p className="font-bold text-sm leading-tight">Dates & Wheat</p>
              <p className="text-[10px] text-[#E8D5A3]/60">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? "bg-[#C9A84C] text-white" : "text-[#E8D5A3]/70 hover:bg-white/10 hover:text-white"
                }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#E8D5A3]/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer mb-1">
              <Home className="h-4 w-4" />
              <span className="text-sm">View Store</span>
            </div>
          </Link>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#E8D5A3]/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E8D5A3] px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-semibold text-[#3E1F00]">
              {NAV_ITEMS.find(n => n.href === location || (n.href !== "/admin" && location.startsWith(n.href)))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-[#F5ECD7] text-[#C9A84C] border-[#C9A84C]">Admin</Badge>
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
