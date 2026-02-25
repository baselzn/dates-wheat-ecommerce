import Layout from "@/components/Layout";
import { usePixelTrack } from "@/components/PixelManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { sendFirebaseOtp, verifyFirebaseOtp, clearRecaptcha } from "@/lib/firebase";
import type { ConfirmationResult } from "firebase/auth";
import { Phone, Shield, ArrowLeft, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Auth() {
  const { track } = usePixelTrack();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // OTP flow state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Admin login state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const adminLogin = trpc.auth.adminLogin.useMutation();
  const firebaseLogin = trpc.auth.firebaseLogin.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => clearRecaptcha();
  }, []);

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    // If user enters without country code (UAE), prepend +971
    if (digits.startsWith("971")) return `+${digits}`;
    if (digits.startsWith("0")) return `+971${digits.slice(1)}`;
    return `+971${digits}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setOtpLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      const result = await sendFirebaseOtp(formattedPhone, "recaptcha-container");
      setConfirmationResult(result);
      setOtpSent(true);
      setCountdown(60);
      toast.success("OTP sent!", {
        description: `A 6-digit code was sent to ${formattedPhone}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      // Provide friendly error messages
      if (msg.includes("invalid-phone-number")) {
        toast.error("Invalid phone number. Please include country code (e.g. 0501234567).");
      } else if (msg.includes("too-many-requests")) {
        toast.error("Too many attempts. Please wait a few minutes and try again.");
      } else if (msg.includes("billing-not-enabled")) {
        toast.error("SMS service not enabled. Please contact support.");
      } else {
        toast.error(msg);
      }
      clearRecaptcha();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !confirmationResult) return;
    setOtpLoading(true);
    try {
      // Step 1: Verify OTP with Firebase and get ID token
      const idToken = await verifyFirebaseOtp(confirmationResult, otp);

      // Step 2: Exchange Firebase ID token for our app JWT session
      await firebaseLogin.mutateAsync({ idToken, phone: formatPhone(phone) });
      await utils.auth.me.invalidate();

      track("CompleteRegistration", { method: "firebase_otp", currency: "AED", value: 0 });
      toast.success("Welcome to Dates & Wheat! 🍯");
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      if (msg.includes("invalid-verification-code")) {
        toast.error("Incorrect code. Please check and try again.");
      } else if (msg.includes("code-expired")) {
        toast.error("Code expired. Please request a new OTP.");
        setOtpSent(false);
        setOtp("");
        clearRecaptcha();
      } else {
        toast.error(msg);
      }
      setOtp("");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = () => {
    setOtpSent(false);
    setOtp("");
    setConfirmationResult(null);
    clearRecaptcha();
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      await adminLogin.mutateAsync({ email: adminEmail, password: adminPassword });
      await utils.auth.me.invalidate();
      toast.success("Welcome, Admin!");
      navigate("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      toast.error(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <Layout>
      {/* Invisible reCAPTCHA container — must be in DOM */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🍯</div>
            <h1
              className="text-2xl font-bold text-[#3E1F00]"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              Welcome to Dates & Wheat
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sign in or create an account to continue
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8D5A3] p-6 shadow-sm">
            <Tabs defaultValue="customer">
              <TabsList className="w-full mb-6 bg-[#F5ECD7]">
                <TabsTrigger
                  value="customer"
                  className="flex-1 data-[state=active]:bg-[#C9A84C] data-[state=active]:text-white"
                >
                  <Phone className="h-4 w-4 mr-2" /> Customer
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="flex-1 data-[state=active]:bg-[#3E1F00] data-[state=active]:text-white"
                >
                  <Shield className="h-4 w-4 mr-2" /> Admin
                </TabsTrigger>
              </TabsList>

              {/* ── Customer: Firebase Phone OTP ── */}
              <TabsContent value="customer">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    {/* Phone input */}
                    <div>
                      <Label htmlFor="phone" className="text-[#3E1F00] font-medium">
                        Phone Number
                      </Label>
                      <div className="relative mt-1.5">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                          <span className="text-base">🇦🇪</span>
                          <span className="text-sm text-muted-foreground font-medium">+971</span>
                          <span className="text-muted-foreground/40">|</span>
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="50 123 4567"
                          className="pl-20 border-[#E8D5A3] focus:border-[#C9A84C] h-11 text-base"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Smartphone className="h-3 w-3" />
                        We'll send a 6-digit verification code via SMS
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={otpLoading || !phone.trim()}
                      className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11 text-base"
                    >
                      {otpLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Sending OTP...
                        </span>
                      ) : (
                        "Send Verification Code"
                      )}
                    </Button>

                    {/* Powered by Firebase badge */}
                    <p className="text-center text-xs text-muted-foreground">
                      Secured by{" "}
                      <span className="font-semibold text-[#F57C00]">Firebase</span> &amp; Google reCAPTCHA
                    </p>
                  </form>
                ) : (
                  <div className="space-y-5">
                    {/* Back button */}
                    <button
                      onClick={handleResend}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#3E1F00] transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change number
                    </button>

                    {/* Instruction */}
                    <div className="text-center bg-[#F5ECD7] rounded-xl p-4">
                      <Smartphone className="h-8 w-8 text-[#C9A84C] mx-auto mb-2" />
                      <p className="text-sm font-medium text-[#3E1F00]">
                        Code sent to
                      </p>
                      <p className="text-base font-bold text-[#C9A84C] mt-0.5">
                        {formatPhone(phone)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter the 6-digit code below
                      </p>
                    </div>

                    {/* OTP input */}
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        onComplete={handleVerifyOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otp.length !== 6}
                      className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11 text-base"
                    >
                      {otpLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify & Sign In"
                      )}
                    </Button>

                    {/* Resend */}
                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Resend code in{" "}
                          <span className="font-semibold text-[#C9A84C]">{countdown}s</span>
                        </p>
                      ) : (
                        <button
                          onClick={handleResend}
                          className="text-sm text-[#C9A84C] hover:underline font-medium"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── Admin: Email + Password ── */}
              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="adminEmail" className="text-[#3E1F00] font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@datesandwheat.com"
                      required
                      className="mt-1.5 border-[#E8D5A3] focus:border-[#C9A84C] h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword" className="text-[#3E1F00] font-medium">
                      Password
                    </Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="mt-1.5 border-[#E8D5A3] focus:border-[#C9A84C] h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full bg-[#3E1F00] hover:bg-[#6B3A0F] text-white font-semibold h-11 text-base"
                  >
                    {adminLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Signing In...
                      </span>
                    ) : (
                      "Admin Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-[#C9A84C] hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[#C9A84C] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
