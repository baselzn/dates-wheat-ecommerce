import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-[#3E1F00] text-[#E8D5A3]">
      {/* Main footer */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>
                Dates & Wheat
              </h3>
              <p className="text-[#C9A84C] font-arabic text-lg" dir="rtl">تمر وقمح</p>
            </div>
            <p className="text-sm text-[#C9A84C]/80 leading-relaxed mb-4">
              Premium Arabic sweets and confectionery crafted with love since 1990. 
              Handmade in Fujairah, UAE.
            </p>
            <div className="flex gap-3">
              <a
                href="https://instagram.com/datesandwheat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#C9A84C]/20 flex items-center justify-center hover:bg-[#C9A84C] transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com/datesandwheat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#C9A84C]/20 flex items-center justify-center hover:bg-[#C9A84C] transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com/@datesandwheat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#C9A84C]/20 flex items-center justify-center hover:bg-[#C9A84C] transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/", label: "Home" },
                { href: "/shop", label: "Shop" },
                { href: "/about", label: "Our Story" },
                { href: "/contact", label: "Contact Us" },
                { href: "/auth", label: "Login / Register" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[#C9A84C]/80 hover:text-[#C9A84C] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-white mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/shop?category=arabic-sweets", label: "Arabic Sweets" },
                { href: "/shop?category=gluten-free", label: "Gluten Free" },
                { href: "/shop?category=free-sugar", label: "Sugar Free" },
                { href: "/shop?category=nuts", label: "Nuts & Dried Fruits" },
                { href: "/shop?category=arabic-coffee", label: "Arabic Coffee" },
                { href: "/shop?category=gift-boxes", label: "Gift Boxes" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[#C9A84C]/80 hover:text-[#C9A84C] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="h-4 w-4 text-[#C9A84C] shrink-0 mt-0.5" />
                <span className="text-[#C9A84C]/80">
                  Fujairah – Madab – Front KM Trading<br />
                  Fujairah, UAE
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="h-4 w-4 text-[#C9A84C] shrink-0" />
                <a href="tel:+97192237070" className="text-[#C9A84C]/80 hover:text-[#C9A84C] transition-colors">
                  +971 9 2237070
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="h-4 w-4 text-[#C9A84C] shrink-0" />
                <a href="mailto:info@datesandwheat.com" className="text-[#C9A84C]/80 hover:text-[#C9A84C] transition-colors">
                  info@datesandwheat.com
                </a>
              </li>
            </ul>
            {/* WhatsApp */}
            <a
              href="https://wa.me/97192237070"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#C9A84C]/20">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#C9A84C]/60">
          <p>© {new Date().getFullYear()} Dates & Wheat. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#C9A84C] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#C9A84C] transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
