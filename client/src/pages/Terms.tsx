import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold font-serif text-foreground mb-2">Terms &amp; Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-amber max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Dates &amp; Wheat website (datesandwheat.com), you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Products &amp; Pricing</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>All prices are displayed in UAE Dirhams (AED) and include 5% VAT.</li>
              <li>We reserve the right to change prices at any time without prior notice.</li>
              <li>Product images are for illustration purposes; actual products may vary slightly.</li>
              <li>We reserve the right to limit quantities or refuse orders at our discretion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Orders &amp; Payment</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Orders are confirmed upon successful payment or COD acceptance.</li>
              <li>We accept online card payments (Stripe) and Cash on Delivery (COD).</li>
              <li>For COD orders, payment is due upon delivery. Refusal to pay on delivery may result in account suspension.</li>
              <li>Order confirmation will be sent via SMS or push notification.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Delivery</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>We deliver across the UAE. Delivery times vary by emirate (typically 1–3 business days).</li>
              <li>Free delivery on orders above AED 200. A delivery fee of AED 25 applies to orders below this threshold.</li>
              <li>We are not responsible for delays caused by incorrect addresses or circumstances beyond our control.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Returns &amp; Refunds</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Due to the perishable nature of our products, we do not accept returns unless the product is damaged or incorrect.</li>
              <li>Claims for damaged or incorrect items must be made within 24 hours of delivery with photographic evidence.</li>
              <li>Approved refunds will be processed within 5–7 business days to the original payment method.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Coupons &amp; Discounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              Coupon codes are subject to their individual terms. Only one coupon may be applied per order. Coupons cannot be combined with other offers unless explicitly stated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on this website, including logos, images, text, and design, is the property of Dates &amp; Wheat and is protected by UAE copyright law. Unauthorized use is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dates &amp; Wheat shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products. Our total liability shall not exceed the value of the order in question.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms &amp; Conditions are governed by the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the UAE courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us:<br />
              <strong>Dates &amp; Wheat</strong><br />
              Email: <a href="mailto:info@datesandwheat.com" className="text-amber-800 underline">info@datesandwheat.com</a><br />
              Phone: <a href="tel:+97192237070" className="text-amber-800 underline">+971 9 223 7070</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
