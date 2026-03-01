import { Link } from "wouter";
import { Home, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      {/* Decorative number with palm tree overlay */}
      <div className="relative mb-8 select-none">
        <div className="text-[140px] font-bold text-amber-900/10 leading-none font-serif">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl">🌴</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3 font-serif">
        Page Not Found
      </h1>
      <p className="text-muted-foreground text-lg mb-2 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <p className="text-muted-foreground/70 text-sm mb-8 font-arabic" dir="rtl">
        الصفحة التي تبحث عنها غير موجودة
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="bg-amber-800 hover:bg-amber-700 text-white">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-amber-800 text-amber-800 hover:bg-amber-50">
          <Link href="/shop">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Browse Shop
          </Link>
        </Button>
      </div>

      <button
        onClick={() => window.history.back()}
        className="mt-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Go back
      </button>
    </div>
  );
}
