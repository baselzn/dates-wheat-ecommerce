import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    // Simulate send
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-[#3E1F00] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30">Get in Touch</Badge>
          <h1 className="font-playfair text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Have a question about an order, a custom gift request, or just want to say hello? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-[#FFF8F0]">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-16">

          {/* Contact Info */}
          <div>
            <h2 className="font-playfair text-3xl font-bold text-[#3E1F00] mb-8">We're Here for You</h2>

            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#F5ECD7] shadow-sm">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <div>
                  <div className="font-semibold text-[#3E1F00] mb-1">Phone</div>
                  <a href="tel:+97192237070" className="text-[#3E1F00]/70 hover:text-[#C9A84C] transition-colors">
                    +971 9 223 7070
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#F5ECD7] shadow-sm">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-[#3E1F00] mb-1">WhatsApp</div>
                  <a
                    href="https://wa.me/97192237070"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3E1F00]/70 hover:text-green-600 transition-colors"
                  >
                    +971 9 223 7070
                  </a>
                  <div className="text-xs text-[#3E1F00]/40 mt-0.5">Fastest response</div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#F5ECD7] shadow-sm">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <div>
                  <div className="font-semibold text-[#3E1F00] mb-1">Email</div>
                  <a href="mailto:info@datesandwheat.com" className="text-[#3E1F00]/70 hover:text-[#C9A84C] transition-colors">
                    info@datesandwheat.com
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#F5ECD7] shadow-sm">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <div>
                  <div className="font-semibold text-[#3E1F00] mb-1">Store Location</div>
                  <div className="text-[#3E1F00]/70 text-sm leading-relaxed">
                    Fujairah – Madab – Front KM Trading<br />
                    Fujairah, United Arab Emirates
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#F5ECD7] shadow-sm">
                <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-[#C9A84C]" />
                </div>
                <div>
                  <div className="font-semibold text-[#3E1F00] mb-2">Opening Hours</div>
                  <div className="space-y-1 text-sm text-[#3E1F00]/70">
                    <div className="flex justify-between gap-8">
                      <span>Saturday – Thursday</span>
                      <span className="font-medium">9:00 AM – 10:00 PM</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span>Friday</span>
                      <span className="font-medium">2:00 PM – 10:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Social */}
            <div>
              <div className="font-semibold text-[#3E1F00] mb-4">Follow Us</div>
              <div className="flex gap-3">
                <a
                  href="https://instagram.com/datesandwheat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 bg-white border border-[#F5ECD7] rounded-xl flex items-center justify-center hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors text-[#3E1F00]/60"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://facebook.com/datesandwheat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 bg-white border border-[#F5ECD7] rounded-xl flex items-center justify-center hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors text-[#3E1F00]/60"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="https://wa.me/97192237070"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 bg-white border border-[#F5ECD7] rounded-xl flex items-center justify-center hover:border-green-500 hover:text-green-500 transition-colors text-[#3E1F00]/60"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F5ECD7]">
              <h2 className="font-playfair text-2xl font-bold text-[#3E1F00] mb-2">Send a Message</h2>
              <p className="text-[#3E1F00]/60 text-sm mb-8">We typically respond within 24 hours.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[#3E1F00] font-medium text-sm">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="border-[#F5ECD7] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[#3E1F00] font-medium text-sm">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="border-[#F5ECD7] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject" className="text-[#3E1F00] font-medium text-sm">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Custom gift box inquiry"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="border-[#F5ECD7] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-[#3E1F00] font-medium text-sm">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help you..."
                    rows={6}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="border-[#F5ECD7] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-[#C9A84C] hover:bg-[#b8963e] text-white font-semibold py-3 rounded-xl"
                >
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>

            {/* Quick WhatsApp CTA */}
            <div className="mt-6 p-5 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-green-900 text-sm">Prefer WhatsApp?</div>
                <div className="text-green-700 text-xs">Get an instant reply on WhatsApp</div>
              </div>
              <a
                href="https://wa.me/97192237070"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs">
                  Chat Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
