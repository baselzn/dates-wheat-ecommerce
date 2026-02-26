/**
 * PWAInstallBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * • Android / Chrome  → captures the `beforeinstallprompt` event and shows a
 *   compact top-of-page banner with a single "Install" CTA.
 * • iOS / Safari      → detects the platform and shows a bottom sheet with a
 *   3-step visual guide (Share → Add to Home Screen → Add).
 * • Both variants snooze for 7 days when dismissed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react";
import { X, Share, Plus, Download, Smartphone } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const SNOOZE_KEY = "pwa_install_dismissed_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const LOGO_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/109084477/lQfRZsUBmPvUTuLR.webp";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSnoozed() {
  try {
    const v = localStorage.getItem(SNOOZE_KEY);
    return v ? Date.now() < Number(v) : false;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
}

function isIOSSafari() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = isIOS && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  return isSafari;
}

function isStandalone() {
  return (
    ("standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

// ─── Android Banner ───────────────────────────────────────────────────────────
interface AndroidBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

function AndroidBanner({ onInstall, onDismiss }: AndroidBannerProps) {
  return (
    <div className="w-full bg-gradient-to-r from-[#1a0f00] to-[#2d1a00] border-b border-[#c9a96e]/20 px-4 py-3 z-50">
      <div className="max-w-screen-xl mx-auto flex items-center gap-3">
        {/* App icon */}
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-[#c9a96e]/20 shadow">
          <img src={LOGO_URL} alt="Dates & Wheat" className="w-full h-full object-cover" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#f5e6c8] leading-tight truncate">
            Install Dates &amp; Wheat
          </p>
          <p className="text-xs text-[#c9a96e]/70 truncate">
            Add to your home screen for a faster experience
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#c9a96e] to-[#8b6914] text-white text-xs font-semibold flex-shrink-0 shadow"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-[#c9a96e]/60 hover:text-[#c9a96e] flex-shrink-0 ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── iOS Guide Sheet ──────────────────────────────────────────────────────────
interface IOSSheetProps {
  onDismiss: () => void;
}

function IOSSheet({ onDismiss }: IOSSheetProps) {
  const steps = [
    {
      icon: <Share className="w-5 h-5 text-[#c9a96e]" />,
      title: "Tap the Share button",
      desc: 'In Safari, tap the Share icon (□↑) at the bottom of your screen.',
    },
    {
      icon: <Plus className="w-5 h-5 text-[#c9a96e]" />,
      title: 'Tap "Add to Home Screen"',
      desc: 'Scroll down in the share sheet and tap "Add to Home Screen".',
    },
    {
      icon: <Smartphone className="w-5 h-5 text-[#c9a96e]" />,
      title: 'Tap "Add" to confirm',
      desc: 'The app icon will appear on your home screen — tap it to launch.',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1a0f00 0%, #2d1a00 100%)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#c9a96e]/30" />
        </div>

        <div className="px-5 pb-10 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#c9a96e]/20 shadow-lg">
                <img src={LOGO_URL} alt="Dates & Wheat" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-base font-bold text-[#f5e6c8]">Add to Home Screen</p>
                <p className="text-xs text-[#c9a96e]/70">Install Dates &amp; Wheat as an app</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-[#c9a96e]/60 hover:text-[#c9a96e]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                {/* Number + icon */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#c9a96e]/15 border border-[#c9a96e]/20 flex items-center justify-center">
                    {step.icon}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-4 bg-[#c9a96e]/20" />
                  )}
                </div>
                {/* Text */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-[#c9a96e] bg-[#c9a96e]/10 px-1.5 py-0.5 rounded-md">
                      Step {i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#f5e6c8] leading-snug">
                    {step.title}
                  </p>
                  <p className="text-xs text-[#c9a96e]/70 mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Visual hint arrow pointing down toward Safari toolbar */}
          <div className="mt-5 flex flex-col items-center gap-1">
            <p className="text-xs text-[#c9a96e]/50 text-center">
              Look for the Share icon (□↑) in the Safari toolbar below
            </p>
            <div className="flex flex-col items-center gap-0.5 text-[#c9a96e]/30">
              <div className="w-px h-4 bg-[#c9a96e]/20" />
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "6px solid rgba(201,169,110,0.3)",
                }}
              />
            </div>
          </div>

          {/* Dismiss link */}
          <button
            onClick={onDismiss}
            className="mt-4 w-full text-center text-xs text-[#c9a96e]/40 hover:text-[#c9a96e]/60 transition-colors"
          >
            Maybe later — don't show for 7 days
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function PWAInstallBanner() {
  // Android deferred prompt
  const deferredPrompt = useRef<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    if (isIOSSafari()) {
      // Show iOS guide after 3 s
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(t);
    }

    // Android: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as typeof deferredPrompt.current;
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── Android handlers ──
  const handleAndroidInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") snooze();
    deferredPrompt.current = null;
    setShowAndroid(false);
  };

  const handleAndroidDismiss = () => {
    snooze();
    setShowAndroid(false);
  };

  // ── iOS handlers ──
  const handleIOSDismiss = () => {
    snooze();
    setShowIOS(false);
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <>
      {showAndroid && (
        <AndroidBanner onInstall={handleAndroidInstall} onDismiss={handleAndroidDismiss} />
      )}
      {showIOS && <IOSSheet onDismiss={handleIOSDismiss} />}
    </>
  );
}
