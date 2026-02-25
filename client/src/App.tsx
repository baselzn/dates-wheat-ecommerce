import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Customer pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Auth from "./pages/Auth";
import Account from "./pages/Account";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminCategories from "./pages/admin/Categories";
import AdminCoupons from "./pages/admin/Coupons";
import AdminSettings from "./pages/admin/Settings";
import AdminAnalytics from "./pages/admin/Analytics";

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

      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/analytics" component={AdminAnalytics} />

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
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
