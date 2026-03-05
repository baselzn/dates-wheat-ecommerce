import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3, Bell, BookOpen, Box, Calculator, ClipboardList, Factory,
  FileText, FlaskConical, Home, LayoutDashboard, Package, Percent,
  Radio, Receipt, Settings, ShoppingCart, Tag, Terminal, TrendingDown,
  TrendingUp, Truck, Users, Warehouse, ToggleLeft, MessageCircle, Search
} from "lucide-react";

type CommandItem = {
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
  group: string;
};

const COMMANDS: CommandItem[] = [
  // E-Commerce
  { label: "Dashboard", description: "Admin overview", href: "/admin", icon: LayoutDashboard, group: "E-Commerce" },
  { label: "Products", description: "Manage products", href: "/admin/products", icon: Box, group: "E-Commerce" },
  { label: "Orders", description: "View all orders", href: "/admin/orders", icon: ShoppingCart, group: "E-Commerce" },
  { label: "Customers", description: "Customer list", href: "/admin/customers", icon: Users, group: "E-Commerce" },
  { label: "Categories", description: "Product categories", href: "/admin/categories", icon: Tag, group: "E-Commerce" },
  { label: "Coupons", description: "Discount coupons", href: "/admin/coupons", icon: Percent, group: "E-Commerce" },
  { label: "Discount Rules", description: "Pricing rules", href: "/admin/discount-rules", icon: Percent, group: "E-Commerce" },
  { label: "Product Q&A", description: "Customer questions", href: "/admin/ecommerce/qa", icon: MessageCircle, group: "E-Commerce" },
  // Inventory
  { label: "Stock Levels", href: "/admin/inventory/stock", icon: Warehouse, group: "Inventory" },
  { label: "Stock Movements", href: "/admin/inventory/movements", icon: TrendingUp, group: "Inventory" },
  { label: "Adjustments", href: "/admin/inventory/adjustments", icon: ClipboardList, group: "Inventory" },
  { label: "Transfers", href: "/admin/inventory/transfers", icon: Truck, group: "Inventory" },
  { label: "Warehouses", href: "/admin/inventory/warehouses", icon: Warehouse, group: "Inventory" },
  { label: "Batch Tracking", href: "/admin/inventory/batches", icon: Package, group: "Inventory" },
  { label: "Forecasting", description: "Stockout predictions", href: "/admin/inventory/forecasting", icon: TrendingDown, group: "Inventory" },
  // POS
  { label: "POS Dashboard", href: "/admin/pos/dashboard", icon: LayoutDashboard, group: "Point of Sale" },
  { label: "POS Terminal", href: "/admin/pos/terminal", icon: Terminal, group: "Point of Sale" },
  { label: "POS Sessions", href: "/admin/pos/sessions", icon: Receipt, group: "Point of Sale" },
  { label: "POS Orders", href: "/admin/pos/orders", icon: ShoppingCart, group: "Point of Sale" },
  { label: "Payment Methods", href: "/admin/pos/payment-methods", icon: Calculator, group: "Point of Sale" },
  { label: "Z-Report", description: "End-of-day report", href: "/admin/pos/z-report", icon: FileText, group: "Point of Sale" },
  // Manufacturing
  { label: "Production Orders", href: "/admin/manufacturing/production", icon: Factory, group: "Manufacturing" },
  { label: "Recipes / BOMs", href: "/admin/manufacturing/recipes", icon: FlaskConical, group: "Manufacturing" },
  { label: "Raw Materials", href: "/admin/manufacturing/raw-materials", icon: Package, group: "Manufacturing" },
  { label: "Purchase Orders", href: "/admin/manufacturing/purchase-orders", icon: ClipboardList, group: "Manufacturing" },
  { label: "Suppliers", href: "/admin/manufacturing/suppliers", icon: Truck, group: "Manufacturing" },
  // Accounting
  { label: "Chart of Accounts", href: "/admin/accounting/chart-of-accounts", icon: BookOpen, group: "Accounting" },
  { label: "Journal Entries", href: "/admin/accounting/journal-entries", icon: ClipboardList, group: "Accounting" },
  { label: "Financial Reports", href: "/admin/accounting/reports", icon: TrendingUp, group: "Accounting" },
  { label: "VAT Return", description: "ZATCA VAT filing", href: "/admin/accounting/vat-return", icon: FileText, group: "Accounting" },
  // Tools
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, group: "Tools" },
  { label: "Push Notifications", href: "/admin/push-notifications", icon: Bell, group: "Tools" },
  { label: "Tracking Pixels", href: "/admin/tracking", icon: Radio, group: "Tools" },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: ToggleLeft, group: "Tools" },
  { label: "Settings", href: "/admin/settings", icon: Settings, group: "Tools" },
  // Store
  { label: "View Store", description: "Open customer storefront", href: "/", icon: Home, group: "Store" },
  { label: "Shop", href: "/shop", icon: ShoppingCart, group: "Store" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setQuery("");
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS.slice(0, 12);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[selected]) {
      navigate(filtered[selected].href);
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#1a0a00] rounded-xl shadow-2xl border border-[#E8D5A3]/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8D5A3]/20">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, features…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No results for "{query}"</p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.href}
                  onClick={() => { navigate(cmd.href); setOpen(false); }}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? "bg-[#C9A84C]/10 text-[#3E1F00]" : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    i === selected ? "bg-[#C9A84C] text-white" : "bg-muted"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cmd.label}</p>
                    {cmd.description && (
                      <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{cmd.group}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[#E8D5A3]/20 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto"><kbd className="font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
