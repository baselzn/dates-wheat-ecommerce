import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Bell, BookOpen, Box, Calculator, ChevronDown, ChevronRight,
  ClipboardList, Factory, FileText, FlaskConical, Home, LayoutDashboard, LogOut,
  MessageCircle, Package, Percent, Radio, Receipt, Search, Settings, ShoppingCart, Tag, Terminal,
  TrendingDown, TrendingUp, Truck, Users, Warehouse, ToggleLeft
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import CommandPalette from "./CommandPalette";

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "E-Commerce",
    icon: ShoppingCart,
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Products", href: "/admin/products", icon: Box },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Categories", href: "/admin/categories", icon: Tag },
      { label: "Coupons", href: "/admin/coupons", icon: Percent },
      { label: "Discount Rules", href: "/admin/discount-rules", icon: Percent },
      { label: "Product Q&A", href: "/admin/ecommerce/qa", icon: MessageCircle },
    ],
  },
  {
    label: "Inventory",
    icon: Warehouse,
    items: [
      { label: "Stock Levels", href: "/admin/inventory/stock", icon: Warehouse },
      { label: "Stock Movements", href: "/admin/inventory/movements", icon: TrendingUp },
      { label: "Adjustments", href: "/admin/inventory/adjustments", icon: ClipboardList },
      { label: "Transfers", href: "/admin/inventory/transfers", icon: Truck },
      { label: "Warehouses", href: "/admin/inventory/warehouses", icon: Warehouse },
      { label: "Batch Tracking", href: "/admin/inventory/batches", icon: Package },
      { label: "Forecasting", href: "/admin/inventory/forecasting", icon: TrendingDown },
    ],
  },
  {
    label: "Point of Sale",
    icon: Terminal,
    items: [
      { label: "Dashboard", href: "/admin/pos/dashboard", icon: LayoutDashboard },
      { label: "POS Terminal", href: "/admin/pos/terminal", icon: Terminal },
      { label: "Sessions", href: "/admin/pos/sessions", icon: Receipt },
      { label: "POS Orders", href: "/admin/pos/orders", icon: ShoppingCart },
      { label: "Payment Methods", href: "/admin/pos/payment-methods", icon: Calculator },
      { label: "Z-Report", href: "/admin/pos/z-report", icon: FileText },
      { label: "POS Settings", href: "/admin/pos/settings", icon: Settings },
    ],
  },
  {
    label: "Manufacturing",
    icon: Factory,
    items: [
      { label: "Production Orders", href: "/admin/manufacturing/production", icon: Factory },
      { label: "Recipes / BOMs", href: "/admin/manufacturing/recipes", icon: FlaskConical },
      { label: "Raw Materials", href: "/admin/manufacturing/raw-materials", icon: Package },
      { label: "Purchase Orders", href: "/admin/manufacturing/purchase-orders", icon: ClipboardList },
      { label: "Suppliers", href: "/admin/manufacturing/suppliers", icon: Truck },
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    items: [
      { label: "Chart of Accounts", href: "/admin/accounting/chart-of-accounts", icon: BookOpen },
      { label: "Journal Entries", href: "/admin/accounting/journal-entries", icon: ClipboardList },
      { label: "Financial Reports", href: "/admin/accounting/reports", icon: TrendingUp },
      { label: "VAT Return", href: "/admin/accounting/vat-return", icon: FileText },
    ],
  },
  {
    label: "Tools",
    icon: Settings,
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Push Notifications", href: "/admin/push-notifications", icon: Bell },
      { label: "Tracking Pixels", href: "/admin/tracking", icon: Radio },
      { label: "WooCommerce Import", href: "/admin/woo-importer", icon: Package },
      { label: "Feature Flags", href: "/admin/feature-flags", icon: ToggleLeft },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Flat list for header title lookup
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

function NavGroup({ group, location }: { group: NavGroup; location: string }) {
  const isGroupActive = group.items.some(
    item => location === item.href || (item.href !== "/admin" && location.startsWith(item.href))
  );
  const [open, setOpen] = useState(isGroupActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
          isGroupActive ? "text-white" : "text-[#E8D5A3]/60 hover:text-[#E8D5A3]"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider flex-1">{group.label}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {group.items.map(item => {
            const ItemIcon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive ? "bg-[#C9A84C] text-white" : "text-[#E8D5A3]/70 hover:bg-white/10 hover:text-white"
                }`}>
                  <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/admin/login");
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

  const currentLabel = ALL_NAV_ITEMS.find(
    n => location === n.href || (n.href !== "/admin" && location.startsWith(n.href))
  )?.label || "Dashboard";

  return (
    <div className="min-h-screen flex bg-[#F5ECD7]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#3E1F00] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/109084477/lQfRZsUBmPvUTuLR.webp"
              alt="Dates & Wheat"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
            <p className="text-[10px] text-[#E8D5A3]/60 mt-1">Admin Panel</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <NavGroup key={group.label} group={group} location={location} />
          ))}
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
            <h1 className="font-semibold text-[#3E1F00]">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted rounded-lg border hover:bg-muted/80 transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>Search</span>
              <kbd className="font-mono text-[10px] ml-1">⌘K</kbd>
            </button>
            <Badge className="bg-[#F5ECD7] text-[#C9A84C] border-[#C9A84C]">Admin</Badge>
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <CommandPalette />
          {children}
        </main>
      </div>
    </div>
  );
}
