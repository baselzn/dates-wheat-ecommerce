import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PixelManagerProvider } from "./components/PixelManager";

// Customer pages (eagerly loaded — part of initial bundle)
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import TrackOrder from "./pages/TrackOrder";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Admin pages (lazily loaded — split into separate chunks)
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminTracking = lazy(() => import("./pages/admin/Tracking"));
const AdminDiscountRules = lazy(() => import("./pages/admin/DiscountRules"));
const AdminWooImporter = lazy(() => import("./pages/admin/WooImporter"));
const AdminPushNotifications = lazy(() => import("./pages/admin/PushNotifications"));
// Inventory
const AdminStockLevels = lazy(() => import("./pages/admin/inventory/StockLevels"));
const AdminStockMovements = lazy(() => import("./pages/admin/inventory/StockMovements"));
const AdminWarehouses = lazy(() => import("./pages/admin/inventory/Warehouses"));
const AdminAdjustments = lazy(() => import("./pages/admin/inventory/Adjustments"));
const AdminTransfers = lazy(() => import("./pages/admin/inventory/Transfers"));
// POS
const AdminPOSTerminal = lazy(() => import("./pages/admin/pos/Terminal"));
const AdminPOSSessions = lazy(() => import("./pages/admin/pos/Sessions"));
const AdminPOSOrders = lazy(() => import("./pages/admin/pos/POSOrders"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/pos/PaymentMethods"));
const AdminPOSSettings = lazy(() => import("./pages/admin/pos/Settings"));
const AdminPOSDashboard = lazy(() => import("./pages/admin/pos/Dashboard"));
// Manufacturing
const AdminProduction = lazy(() => import("./pages/admin/manufacturing/Production"));
const AdminRecipes = lazy(() => import("./pages/admin/manufacturing/Recipes"));
const AdminRawMaterials = lazy(() => import("./pages/admin/manufacturing/RawMaterials"));
const AdminSuppliers = lazy(() => import("./pages/admin/manufacturing/Suppliers"));
const AdminPurchaseOrders = lazy(() => import("./pages/admin/manufacturing/PurchaseOrders"));
// Accounting
const AdminChartOfAccounts = lazy(() => import("./pages/admin/accounting/ChartOfAccounts"));
const AdminJournalEntries = lazy(() => import("./pages/admin/accounting/JournalEntries"));
const AdminAccountingReports = lazy(() => import("./pages/admin/accounting/Reports"));

// Loading fallback for admin pages
function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#1a0a00] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-400 text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Customer routes */}
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/category/:slug" component={Shop} />
      <Route path="/product/:slug" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation/:orderNumber" component={OrderConfirmation} />
      <Route path="/auth" component={Auth} />
      <Route path="/account" component={Account} />
      <Route path="/account/:tab" component={Account} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/track-order" component={TrackOrder} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

      {/* Admin routes — lazily loaded */}
      <Route path="/admin">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminDashboard />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/products">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminProducts />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/orders/:id">
        {(params) => (
          <Suspense fallback={<AdminLoading />}>
            <AdminOrderDetail />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/orders">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminOrders />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/customers">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminCustomers />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/categories">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminCategories />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/coupons">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminCoupons />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminSettings />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/analytics">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminAnalytics />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/tracking">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminTracking />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/discount-rules">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminDiscountRules />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/woo-importer">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminWooImporter />
          </Suspense>
        )}
      </Route>
      <Route path="/admin/push-notifications">
        {() => (
          <Suspense fallback={<AdminLoading />}>
            <AdminPushNotifications />
          </Suspense>
        )}
      </Route>

      {/* Inventory routes — /admin/inventory redirects to stock levels */}
      <Route path="/admin/inventory">{() => <Redirect to="/admin/inventory/stock" />}</Route>
      <Route path="/admin/inventory/stock">{() => <Suspense fallback={<AdminLoading />}><AdminStockLevels /></Suspense>}</Route>
      <Route path="/admin/inventory/movements">{() => <Suspense fallback={<AdminLoading />}><AdminStockMovements /></Suspense>}</Route>
      <Route path="/admin/inventory/warehouses">{() => <Suspense fallback={<AdminLoading />}><AdminWarehouses /></Suspense>}</Route>
      <Route path="/admin/inventory/adjustments">{() => <Suspense fallback={<AdminLoading />}><AdminAdjustments /></Suspense>}</Route>
      <Route path="/admin/inventory/transfers">{() => <Suspense fallback={<AdminLoading />}><AdminTransfers /></Suspense>}</Route>
      {/* POS routes — /admin/pos redirects to terminal */}
      <Route path="/admin/pos">{() => <Redirect to="/admin/pos/terminal" />}</Route>
      <Route path="/admin/pos/terminal">{() => <Suspense fallback={<AdminLoading />}><AdminPOSTerminal /></Suspense>}</Route>
      <Route path="/admin/pos/sessions">{() => <Suspense fallback={<AdminLoading />}><AdminPOSSessions /></Suspense>}</Route>
      <Route path="/admin/pos/orders">{() => <Suspense fallback={<AdminLoading />}><AdminPOSOrders /></Suspense>}</Route>
      <Route path="/admin/pos/payment-methods">{() => <Suspense fallback={<AdminLoading />}><AdminPaymentMethods /></Suspense>}</Route>
      <Route path="/admin/pos/settings">{() => <Suspense fallback={<AdminLoading />}><AdminPOSSettings /></Suspense>}</Route>
      <Route path="/admin/pos/dashboard">{() => <Suspense fallback={<AdminLoading />}><AdminPOSDashboard /></Suspense>}</Route>
      {/* Manufacturing routes — /admin/manufacturing redirects to production */}
      <Route path="/admin/manufacturing">{() => <Redirect to="/admin/manufacturing/production" />}</Route>
      <Route path="/admin/manufacturing/production">{() => <Suspense fallback={<AdminLoading />}><AdminProduction /></Suspense>}</Route>
      <Route path="/admin/manufacturing/recipes">{() => <Suspense fallback={<AdminLoading />}><AdminRecipes /></Suspense>}</Route>
      <Route path="/admin/manufacturing/raw-materials">{() => <Suspense fallback={<AdminLoading />}><AdminRawMaterials /></Suspense>}</Route>
      <Route path="/admin/manufacturing/suppliers">{() => <Suspense fallback={<AdminLoading />}><AdminSuppliers /></Suspense>}</Route>
      <Route path="/admin/manufacturing/purchase-orders">{() => <Suspense fallback={<AdminLoading />}><AdminPurchaseOrders /></Suspense>}</Route>
      {/* Accounting routes — /admin/accounting redirects to chart of accounts */}
      <Route path="/admin/accounting">{() => <Redirect to="/admin/accounting/chart-of-accounts" />}</Route>
      <Route path="/admin/accounting/chart-of-accounts">{() => <Suspense fallback={<AdminLoading />}><AdminChartOfAccounts /></Suspense>}</Route>
      <Route path="/admin/accounting/journal-entries">{() => <Suspense fallback={<AdminLoading />}><AdminJournalEntries /></Suspense>}</Route>
      <Route path="/admin/accounting/reports">{() => <Suspense fallback={<AdminLoading />}><AdminAccountingReports /></Suspense>}</Route>

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <PixelManagerProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </PixelManagerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
