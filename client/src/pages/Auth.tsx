import Layout from "@/components/Layout";
import { usePixelTrack } from "@/components/PixelManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Phone, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Auth() {
  const { track } = usePixelTrack();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // OTP flow
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Admin login
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const sendOtp = trpc.auth.sendOtp.useMutation();
  const verifyOtp = trpc.auth.verifyOtp.useMutation();
  const adminLogin = trpc.auth.adminLogin.useMutation();
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setOtpLoading(true);
    try {
      const result = await sendOtp.mutateAsync({ phone });
      setOtpSent(true);
      setCountdown(60);
      toast.success("OTP sent!", { description: "Check your phone for the verification code." });
      // Dev mode: show OTP in toast
      if (result.code) {
        toast.info(`Dev OTP: ${result.code}`, { duration: 30000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setOtpLoading(true);
    try {
      await verifyOtp.mutateAsync({ phone, code: otp });
      await utils.auth.me.invalidate();
      track("CompleteRegistration", { method: "otp", currency: "AED", value: 0 });
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      toast.error(msg);
      setOtp("");
    } finally {
      setOtpLoading(false);
    }
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
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🍯</div>
            <h1 className="text-2xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
              Welcome to Dates & Wheat
            </h1>
            <p className="text-muted-foreground mt-1">Sign in to your account</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8D5A3] p-6 shadow-sm">
            <Tabs defaultValue="customer">
              <TabsList className="w-full mb-6 bg-[#F5ECD7]">
                <TabsTrigger value="customer" className="flex-1 data-[state=active]:bg-[#C9A84C] data-[state=active]:text-white">
                  <Phone className="h-4 w-4 mr-2" /> Customer
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex-1 data-[state=active]:bg-[#3E1F00] data-[state=active]:text-white">
                  <Shield className="h-4 w-4 mr-2" /> Admin
                </TabsTrigger>
              </TabsList>

              {/* Customer OTP */}
              <TabsContent value="customer">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+971</span>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="50 123 4567"
                          className="pl-12 border-[#E8D5A3] focus:border-[#C9A84C]"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">We'll send a 6-digit code to verify your number</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={otpLoading || !phone.trim()}
                      className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11"
                    >
                      {otpLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Sending...
                        </span>
                      ) : "Send OTP"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to <span className="font-semibold text-[#3E1F00]">{phone}</span>
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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
                      className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11"
                    >
                      {otpLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Verifying...
                        </span>
                      ) : "Verify OTP"}
                    </Button>
                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-sm text-muted-foreground">Resend in {countdown}s</p>
                      ) : (
                        <button
                          onClick={() => { setOtpSent(false); setOtp(""); }}
                          className="text-sm text-[#C9A84C] hover:underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Admin Login */}
              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@datesandwheat.com"
                      required
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword">Password</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full bg-[#3E1F00] hover:bg-[#6B3A0F] text-white font-semibold h-11"
                  >
                    {adminLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Signing In...
                      </span>
                    ) : "Admin Sign In"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-[#C9A84C] hover:underline">Terms</a> and{" "}
            <a href="/privacy" className="text-[#C9A84C] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
