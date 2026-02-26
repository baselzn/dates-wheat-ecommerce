import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
const DISMISSED_KEY = "push_prompt_dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  const subscribeMutation = trpc.push.subscribe.useMutation();

  useEffect(() => {
    // Only show if push is supported and not already granted/dismissed
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Delay showing the prompt by 5 seconds
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setShow(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });

      setStatus("granted");
      setShow(false);
    } catch (err) {
      console.error("Push subscription failed:", err);
      setStatus("denied");
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#1a0f00] border border-[#c9a96e]/30 rounded-2xl p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#8b6914] flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#f5e6c8]">Stay Updated</p>
            <p className="text-xs text-[#c9a96e]/80 mt-0.5 leading-relaxed">
              Get notified about new arrivals, exclusive offers, and order updates.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleAllow}
                disabled={status === "loading"}
                className="flex-1 h-8 text-xs bg-gradient-to-r from-[#c9a96e] to-[#8b6914] hover:opacity-90 text-white border-0"
              >
                {status === "loading" ? "Enabling..." : "Allow"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="flex-1 h-8 text-xs border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#c9a96e]/50 hover:text-[#c9a96e] transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PushNotificationStatus() {
  const [subscribed, setSubscribed] = useState(false);
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const handleUnsubscribe = async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
      setSubscribed(false);
    }
  };

  if (!subscribed) return null;

  return (
    <button
      onClick={handleUnsubscribe}
      className="flex items-center gap-1.5 text-xs text-[#c9a96e]/60 hover:text-[#c9a96e] transition-colors"
      title="Unsubscribe from notifications"
    >
      <BellOff className="w-3.5 h-3.5" />
      <span>Unsubscribe</span>
    </button>
  );
}
