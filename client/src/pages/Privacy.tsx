import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold font-serif text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-amber max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dates &amp; Wheat ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li><strong>Personal Information:</strong> Name, mobile phone number, email address, and delivery address when you register or place an order.</li>
              <li><strong>Order Information:</strong> Products purchased, order history, payment method, and transaction details.</li>
              <li><strong>Device &amp; Usage Data:</strong> IP address, browser type, pages visited, and time spent on our site (collected via analytics).</li>
              <li><strong>Location Data:</strong> If you choose to use the "Use My Location" feature at checkout, we collect your GPS coordinates solely to auto-fill your delivery address.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Process and fulfill your orders.</li>
              <li>Send order confirmations and delivery updates via SMS or push notifications.</li>
              <li>Respond to customer service inquiries.</li>
              <li>Improve our website, products, and services.</li>
              <li>Send promotional offers (only with your consent; you may opt out at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Sharing Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers (e.g., payment processors, delivery companies) solely to fulfill your order, under strict confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including HTTPS encryption, secure session cookies, and rate-limited authentication to protect your data. OTP-based authentication ensures your account cannot be accessed without your mobile phone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and shopping cart. We also use analytics cookies to understand how visitors use our site. You may disable non-essential cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Opt out of marketing communications at any time.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at <a href="mailto:info@datesandwheat.com" className="text-amber-800 underline">info@datesandwheat.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not directed to children under 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us:<br />
              <strong>Dates &amp; Wheat</strong><br />
              Email: <a href="mailto:info@datesandwheat.com" className="text-amber-800 underline">info@datesandwheat.com</a><br />
              Phone: <a href="tel:+97192237070" className="text-amber-800 underline">+971 9 223 7070</a><br />
              UAE
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
