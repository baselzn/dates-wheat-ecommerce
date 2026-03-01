import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "wouter";

const COOKIE_KEY = "dw_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Show after 2 seconds
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#3E1F00] text-white rounded-2xl shadow-2xl p-5 border border-amber-800/30">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-amber-700/30 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-100 mb-1">We use cookies</h3>
            <p className="text-sm text-amber-200/80 leading-relaxed">
              We use essential cookies to keep your cart and session active, and analytics cookies to improve your experience.{" "}
              <Link href="/privacy" className="underline text-amber-300 hover:text-amber-200">
                Learn more
              </Link>
            </p>
          </div>
          <button
            onClick={decline}
            className="shrink-0 text-amber-300/60 hover:text-amber-200 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={accept}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm h-9"
          >
            Accept All
          </Button>
          <Button
            onClick={decline}
            variant="outline"
            className="flex-1 border-amber-700 text-amber-200 hover:bg-amber-800/50 text-sm h-9 bg-transparent"
          >
            Essential Only
          </Button>
        </div>
      </div>
    </div>
  );
}
