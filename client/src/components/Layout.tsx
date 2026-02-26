import Header from "./Header";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import { useCartStore } from "@/stores/cartStore";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export default function Layout({ children, hideFooter }: LayoutProps) {
  const { isCartOpen, openCart, closeCart } = useCartStore();
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8F0]">
      <Header onCartOpen={openCart} />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      <CartDrawer open={isCartOpen} onClose={closeCart} />
    </div>
  );
}
