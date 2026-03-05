import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminLogin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already admin
  useEffect(() => {
    if (!loading && user?.role === "admin") {
      navigate("/admin");
    }
  }, [loading, user, navigate]);

  // Step 1 state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 state
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [userId, setUserId] = useState<number | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const adminLogin = trpc.auth.adminLogin.useMutation();
  const adminVerifyOtp = trpc.auth.adminVerifyOtp.useMutation();
  const utils = trpc.useUtils();

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      const result = await adminLogin.mutateAsync({ email, password });
      if (result.requiresOtp) {
        setUserId(result.userId);
        setStep("otp");
        toast.success("Verification code sent to your notifications");
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      toast.error(msg);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6 || !userId) return;
    try {
      await adminVerifyOtp.mutateAsync({ userId, code });
      await utils.auth.me.invalidate();
      toast.success("Welcome back, Admin!");
      navigate("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      toast.error(msg);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5ECD7]">
        <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5ECD7] flex items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233E1F00' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/109084477/lQfRZsUBmPvUTuLR.webp"
            alt="Dates & Wheat"
            className="h-16 w-auto object-contain mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-[#3E1F00]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Admin Panel
          </h1>
          <p className="text-sm text-[#7A5C3A] mt-1">Secure access — authorized personnel only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-[#E8D5A3] overflow-hidden">
          {/* Header strip */}
          <div className="bg-[#3E1F00] px-6 py-4 flex items-center gap-3">
            {step === "credentials" ? (
              <Lock className="h-5 w-5 text-[#C9A84C]" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[#C9A84C]" />
            )}
            <div>
              <p className="text-white font-semibold text-sm">
                {step === "credentials" ? "Sign In" : "Two-Factor Verification"}
              </p>
              <p className="text-[#E8D5A3]/60 text-xs">
                {step === "credentials" ? "Enter your admin credentials" : "Enter the 6-digit code from your notifications"}
              </p>
            </div>
          </div>

          <div className="p-6">
            {step === "credentials" ? (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[#3E1F00] text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A84C]" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="pl-9 border-[#E8D5A3] focus:border-[#C9A84C] bg-[#FDFAF5]"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[#3E1F00] text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A84C]" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 border-[#E8D5A3] focus:border-[#C9A84C] bg-[#FDFAF5]"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={adminLogin.isPending || !email || !password}
                  className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11"
                >
                  {adminLogin.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Verifying...
                    </span>
                  ) : "Continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F5ECD7] flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="h-7 w-7 text-[#C9A84C]" />
                  </div>
                  <p className="text-sm text-[#7A5C3A]">
                    A 6-digit verification code has been sent to your Manus notifications. Enter it below to complete sign-in.
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-12 text-center text-lg font-bold border-2 border-[#E8D5A3] rounded-lg focus:border-[#C9A84C] focus:outline-none bg-[#FDFAF5] text-[#3E1F00] transition-colors"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={adminVerifyOtp.isPending || otp.join("").length !== 6}
                  className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11"
                >
                  {adminVerifyOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Verifying...
                    </span>
                  ) : "Verify & Sign In"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setOtp(["", "", "", "", "", ""]); }}
                  className="w-full text-sm text-[#7A5C3A] hover:text-[#3E1F00] transition-colors"
                >
                  ← Back to credentials
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#7A5C3A] mt-4">
          <a href="/" className="hover:text-[#3E1F00] transition-colors">← Return to storefront</a>
        </p>
      </div>
    </div>
  );
}
