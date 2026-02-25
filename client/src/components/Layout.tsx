import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export default function Layout({ children, hideFooter }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8F0]">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}
