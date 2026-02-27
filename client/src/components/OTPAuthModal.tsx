/**
 * OTPAuthModal — unified signup/login modal using phone OTP.
 *
 * Modes:
 *   "signup" — collects name + phone → sends OTP → verifies → creates account
 *   "login"  — collects phone only  → sends OTP → verifies → logs in
 *
 * Usage:
 *   <OTPAuthModal
 *     open={open}
 *     onOpenChange={setOpen}
 *     mode="signup"          // or "login"
 *     onSuccess={(user) => ...}
 *   />
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Phone, User, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";

type Mode = "signup" | "login";
type Step = "info" | "otp" | "done";

interface OTPAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: Mode;
  onSuccess?: (user: { id: number; name: string | null; phone: string | null; role: string }) => void;
  /** Title override */
  title?: string;
  /** Description override */
  description?: string;
}

export function OTPAuthModal({
  open,
  onOpenChange,
  mode = "login",
  onSuccess,
  title,
  description,
}: OTPAuthModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("info");
        setName("");
        setPhone("");
        setOtp("");
        setCountdown(0);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 300);
    }
  }, [open]);

  const startCountdown = (seconds = 60) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = trpc.auth.sendOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();
  const utils = trpc.useUtils();

  const handleSendOtp = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    try {
      const result = await sendOtp.mutateAsync({ phone: trimmedPhone });
      // In dev, show the code for testing
      if (result.code) {
        toast.info(`Dev OTP: ${result.code}`, { duration: 15000 });
      } else {
        toast.success("OTP sent to your phone");
      }
      setStep("otp");
      startCountdown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    try {
      const result = await verifyOtpMutation.mutateAsync({
        phone: phone.trim(),
        code: otp,
        name: mode === "signup" ? name.trim() || undefined : undefined,
      });
      await utils.auth.me.invalidate();
      setStep("done");
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.(result.user as any);
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP. Please try again.");
      setOtp("");
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp("");
    await handleSendOtp();
  };

  const defaultTitle = mode === "signup" ? "Create Your Account" : "Sign In";
  const defaultDescription =
    mode === "signup"
      ? "Enter your name and phone number to get started."
      : "Enter your phone number to receive a one-time password.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-[#E8D5A3] p-0 overflow-hidden">
        {/* Header band */}
        <div className="bg-[#3E1F00] px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>
              {title ?? defaultTitle}
            </DialogTitle>
            <DialogDescription className="text-[#E8D5A3] text-sm mt-1">
              {description ?? defaultDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* ── Step: info (name + phone) ── */}
          {step === "info" && (
            <div className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="otp-name" className="text-[#3E1F00] font-medium flex items-center gap-1.5">
                    <User className="h-4 w-4 text-[#C9A84C]" /> Full Name
                  </Label>
                  <Input
                    id="otp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="border-[#E8D5A3] focus:border-[#C9A84C] h-11"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    autoFocus
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="otp-phone" className="text-[#3E1F00] font-medium flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-[#C9A84C]" /> Phone Number
                </Label>
                <Input
                  id="otp-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 000 0000"
                  className="border-[#E8D5A3] focus:border-[#C9A84C] h-11"
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  autoFocus={mode === "login"}
                />
              </div>
              <Button
                onClick={handleSendOtp}
                disabled={sendOtp.isPending}
                className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11"
              >
                {sendOtp.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending OTP...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send OTP <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
              {mode === "signup" && (
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    className="text-[#C9A84C] hover:underline font-medium"
                    onClick={() => onOpenChange(false)}
                  >
                    Sign in instead
                  </button>
                </p>
              )}
            </div>
          )}

          {/* ── Step: OTP entry ── */}
          {step === "otp" && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <p className="text-sm text-[#3E1F00] font-medium">
                  Code sent to <span className="text-[#C9A84C]">{phone}</span>
                </p>
                <p className="text-xs text-muted-foreground">Enter the 6-digit code below</p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleVerifyOtp}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
                className="w-full bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-11"
              >
                {verifyOtpMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep("info"); setOtp(""); }}
                  className="text-muted-foreground hover:text-[#3E1F00] text-xs"
                >
                  ← Change number
                </button>
                {countdown > 0 ? (
                  <span className="text-muted-foreground text-xs">
                    Resend in <span className="font-semibold text-[#C9A84C]">{countdown}s</span>
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={sendOtp.isPending}
                    className="text-[#C9A84C] hover:underline text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === "done" && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-[#3E1F00]">
                {mode === "signup" ? "Account created!" : "Welcome back!"}
              </p>
              <p className="text-sm text-muted-foreground">You are now signed in.</p>
            </div>
          )}
        </div>

        {/* Footer note */}
        {step === "info" && (
          <div className="px-6 pb-4 text-center">
            <p className="text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <a href="/terms" className="text-[#C9A84C] hover:underline">Terms</a> and{" "}
              <a href="/privacy" className="text-[#C9A84C] hover:underline">Privacy Policy</a>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
