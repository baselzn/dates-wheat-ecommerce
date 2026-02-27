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
import { Phone, ArrowLeft, Smartphone, UserPlus, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Shared OTP Step ─────────────────────────────────────────────────────────
function OTPStep({
  phone,
  formatPhone,
  onBack,
  onSuccess,
  name,
}: {
  phone: string;
  formatPhone: (raw: string) => string;
  onBack: () => void;
  onSuccess: () => void;
  name?: string;
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [sent, setSent] = useState(false);

  const firebaseLogin = trpc.auth.firebaseLogin.useMutation();
  const utils = trpc.useUtils();
  const { track } = usePixelTrack();

  useEffect(() => {
    // Auto-send OTP when this step mounts
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown > 0 && sent) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown, sent]);

  const sendCode = async () => {
    try {
      const result = await sendFirebaseOtp(formatPhone(phone));
      setConfirmationResult(result);
      setSent(true);
      setCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      if (msg.includes("invalid-phone-number")) {
        toast.error("Invalid phone number. Please go back and check.");
      } else if (msg.includes("too-many-requests")) {
        toast.error("Too many attempts. Please wait a few minutes.");
      } else if (msg.includes("billing-not-enabled")) {
        toast.error("Firebase SMS not enabled — upgrade Firebase to Blaze plan.", { duration: 8000 });
      } else if (msg.includes("captcha-check-failed") || msg.includes("Hostname match not found")) {
        toast.error(`Add "${window.location.hostname}" to Firebase Authorized Domains.`, { duration: 10000 });
      } else {
        toast.error(msg);
      }
      onBack();
      clearRecaptcha();
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6 || !confirmationResult) return;
    setLoading(true);
    try {
      const idToken = await verifyFirebaseOtp(confirmationResult, otp);
      await firebaseLogin.mutateAsync({ idToken, phone: formatPhone(phone), name: name?.trim() || undefined });
      await utils.auth.me.invalidate();
      track("CompleteRegistration", { method: "firebase_otp", currency: "AED", value: 0 });
      toast.success(name ? `Welcome, ${name.split(" ")[0]}! 🍯` : "Welcome back! 🍯");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      if (msg.includes("invalid-verification-code")) {
        toast.error("Incorrect code. Please check and try again.");
      } else if (msg.includes("code-expired")) {
        toast.error("Code expired. Please request a new one.");
        onBack();
        clearRecaptcha();
      } else {
        toast.error(msg);
      }
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp("");
    setConfirmationResult(null);
    setSent(false);
    clearRecaptcha();
    sendCode();
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => { onBack(); clearRecaptcha(); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#3E1F00] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Change number
      </button>

      <div className="text-center bg-[#F5ECD7] rounded-xl p-4">
        <Smartphone className="h-8 w-8 text-[#C9A84C] mx-auto mb-2" />
        <p className="text-sm font-medium text-[#3E1F00]">Code sent to</p>
        <p className="text-base font-bold text-[#C9A84C] mt-0.5">{formatPhone(phone)}</p>
        <p className="text-xs text-muted-foreground mt-1">Enter the 6-digit code below</p>
      </div>

      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={handleVerify}>
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
        onClick={handleVerify}
        disabled={loading || otp.length !== 6}
        className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11 text-base"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Verifying...
          </span>
        ) : "Verify & Continue"}
      </Button>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend code in <span className="font-semibold text-[#C9A84C]">{countdown}s</span>
          </p>
        ) : (
          <button onClick={handleResend} className="text-sm text-[#C9A84C] hover:underline font-medium">
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Phone Input ─────────────────────────────────────────────────────────────
function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
        <span className="text-base">🇦🇪</span>
        <span className="text-sm text-muted-foreground font-medium">+971</span>
        <span className="text-muted-foreground/40">|</span>
      </div>
      <Input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="50 123 4567"
        className="pl-20 border-[#E8D5A3] focus:border-[#C9A84C] h-11 text-base"
        required
      />
    </div>
  );
}

// ─── Main Auth Page ───────────────────────────────────────────────────────────
export default function Auth() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtpStep, setLoginOtpStep] = useState(false);

  // Sign Up state
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupOtpStep, setSignupOtpStep] = useState(false);

  const utils = trpc.useUtils();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  useEffect(() => {
    return () => clearRecaptcha();
  }, []);

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("971")) return `+${digits}`;
    if (digits.startsWith("0")) return `+971${digits.slice(1)}`;
    return `+971${digits}`;
  };

  const handleAuthSuccess = () => navigate("/");

  return (
    <Layout>
      {/* reCAPTCHA appended to <body> by firebase.ts */}
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-gradient-to-b from-[#FFF8E7] to-white">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src="https://cdn-static.manus.im/webdev-static-assets/Main-Logo-horizontally-1.webp"
              alt="Dates & Wheat"
              className="h-14 mx-auto mb-4 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <p className="text-muted-foreground text-sm">Premium Arabic Confectionery</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8D5A3] shadow-sm overflow-hidden">
            <Tabs defaultValue="login">
              <TabsList className="w-full rounded-none border-b border-[#E8D5A3] bg-[#FFF8E7] h-12 p-0">
                <TabsTrigger
                  value="login"
                  className="flex-1 h-full rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#3E1F00] font-medium"
                >
                  <LogIn className="h-4 w-4 mr-2" /> Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 h-full rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#C9A84C] data-[state=active]:text-[#3E1F00] font-medium"
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Create Account
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                {/* ── LOGIN TAB ── */}
                <TabsContent value="login" className="mt-0">
                  {!loginOtpStep ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (loginPhone.trim()) setLoginOtpStep(true); }}
                      className="space-y-5"
                    >
                      <div className="text-center mb-2">
                        <h2 className="text-xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                          Welcome Back
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Enter your phone number to sign in</p>
                      </div>
                      <div>
                        <Label className="text-[#3E1F00] font-medium">Phone Number</Label>
                        <div className="mt-1.5">
                          <PhoneInput value={loginPhone} onChange={setLoginPhone} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          We'll send a 6-digit verification code via SMS
                        </p>
                      </div>
                      <Button
                        type="submit"
                        disabled={!loginPhone.trim()}
                        className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11 text-base"
                      >
                        Send Verification Code
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          className="text-[#C9A84C] hover:underline font-medium"
                          onClick={() => {
                            const tab = document.querySelector('[data-value="signup"]') as HTMLElement;
                            tab?.click();
                          }}
                        >
                          Create one
                        </button>
                      </p>
                    </form>
                  ) : (
                    <OTPStep
                      phone={loginPhone}
                      formatPhone={formatPhone}
                      onBack={() => setLoginOtpStep(false)}
                      onSuccess={handleAuthSuccess}
                    />
                  )}
                </TabsContent>

                {/* ── SIGN UP TAB ── */}
                <TabsContent value="signup" className="mt-0">
                  {!signupOtpStep ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!signupName.trim()) { toast.error("Please enter your full name."); return; }
                        if (!signupPhone.trim()) { toast.error("Please enter your phone number."); return; }
                        setSignupOtpStep(true);
                      }}
                      className="space-y-5"
                    >
                      <div className="text-center mb-2">
                        <h2 className="text-xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
                          Create Account
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Join us for exclusive offers and easy reordering</p>
                      </div>
                      <div>
                        <Label htmlFor="signupName" className="text-[#3E1F00] font-medium">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="signupName"
                          type="text"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          placeholder="Your full name"
                          className="mt-1.5 border-[#E8D5A3] focus:border-[#C9A84C] h-11 text-base"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-[#3E1F00] font-medium">
                          Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <div className="mt-1.5">
                          <PhoneInput value={signupPhone} onChange={setSignupPhone} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          We'll send a 6-digit verification code via SMS
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11 text-base"
                      >
                        Send Verification Code
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        Already have an account?{" "}
                        <button
                          type="button"
                          className="text-[#C9A84C] hover:underline font-medium"
                          onClick={() => {
                            const tab = document.querySelector('[data-value="login"]') as HTMLElement;
                            tab?.click();
                          }}
                        >
                          Sign in
                        </button>
                      </p>
                    </form>
                  ) : (
                    <OTPStep
                      phone={signupPhone}
                      formatPhone={formatPhone}
                      name={signupName}
                      onBack={() => setSignupOtpStep(false)}
                      onSuccess={handleAuthSuccess}
                    />
                  )}
                </TabsContent>


              </div>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-[#C9A84C] hover:underline">Terms</a>{" "}
            and{" "}
            <a href="/privacy" className="text-[#C9A84C] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
