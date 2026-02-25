import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react";

// ─── Platform Definitions ─────────────────────────────────────────────────────

interface PlatformDef {
  key: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  dashboardUrl: string;
  pixelLabel: string;
  tokenLabel: string;
  hasServerSide: boolean;
  icon: string; // emoji fallback
}

const PLATFORMS: PlatformDef[] = [
  {
    key: "meta",
    name: "Meta (Facebook/Instagram)",
    description: "Facebook Pixel + Instagram Ads + Conversions API (server-side)",
    color: "#1877F2",
    bgColor: "#EBF3FE",
    dashboardUrl: "https://business.facebook.com/events_manager",
    pixelLabel: "Pixel ID",
    tokenLabel: "Conversions API Access Token",
    hasServerSide: true,
    icon: "📘",
  },
  {
    key: "ga4",
    name: "Google Analytics 4",
    description: "Enhanced ecommerce tracking with GA4 events",
    color: "#E37400",
    bgColor: "#FEF3E2",
    dashboardUrl: "https://analytics.google.com",
    pixelLabel: "Measurement ID (G-XXXXXXXX)",
    tokenLabel: "API Secret (for Measurement Protocol)",
    hasServerSide: false,
    icon: "📊",
  },
  {
    key: "google_ads",
    name: "Google Ads",
    description: "Remarketing tag + conversion tracking on purchases",
    color: "#4285F4",
    bgColor: "#EBF3FE",
    dashboardUrl: "https://ads.google.com",
    pixelLabel: "Conversion ID (AW-XXXXXXXXX)",
    tokenLabel: "Conversion Label",
    hasServerSide: false,
    icon: "🎯",
  },
  {
    key: "gtm",
    name: "Google Tag Manager",
    description: "GTM takes precedence over direct GA4/Ads tags when enabled",
    color: "#246FDB",
    bgColor: "#EBF3FE",
    dashboardUrl: "https://tagmanager.google.com",
    pixelLabel: "Container ID (GTM-XXXXXXX)",
    tokenLabel: "Server Container URL (optional)",
    hasServerSide: false,
    icon: "🏷️",
  },
  {
    key: "tiktok",
    name: "TikTok Pixel",
    description: "TikTok Pixel + Events API server-side mirroring",
    color: "#010101",
    bgColor: "#F0F0F0",
    dashboardUrl: "https://ads.tiktok.com/i18n/events_manager",
    pixelLabel: "Pixel ID",
    tokenLabel: "Events API Access Token",
    hasServerSide: true,
    icon: "🎵",
  },
  {
    key: "snapchat",
    name: "Snapchat Pixel",
    description: "Snap Pixel for Snapchat Ads conversion tracking",
    color: "#FFFC00",
    bgColor: "#FFFDE7",
    dashboardUrl: "https://ads.snapchat.com",
    pixelLabel: "Pixel ID",
    tokenLabel: "Conversions API Token",
    hasServerSide: false,
    icon: "👻",
  },
  {
    key: "twitter",
    name: "Twitter / X Pixel",
    description: "Universal Website Tag for X Ads conversion tracking",
    color: "#000000",
    bgColor: "#F0F0F0",
    dashboardUrl: "https://ads.twitter.com",
    pixelLabel: "Pixel ID (Universal Website Tag)",
    tokenLabel: "API Access Token",
    hasServerSide: false,
    icon: "𝕏",
  },
  {
    key: "pinterest",
    name: "Pinterest Tag",
    description: "Pinterest Tag for promoted pins and shopping ads",
    color: "#E60023",
    bgColor: "#FDEAEC",
    dashboardUrl: "https://ads.pinterest.com",
    pixelLabel: "Tag ID",
    tokenLabel: "Conversion Access Token",
    hasServerSide: false,
    icon: "📌",
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business API",
    description: "WhatsApp Business API for order notifications and customer messaging",
    color: "#25D366",
    bgColor: "#E9FBF0",
    dashboardUrl: "https://business.whatsapp.com",
    pixelLabel: "Phone Number ID",
    tokenLabel: "Permanent Access Token",
    hasServerSide: false,
    icon: "💬",
  },
];

// ─── Platform Card ─────────────────────────────────────────────────────────────

interface PixelData {
  platform: string;
  pixelId: string | null;
  accessToken: string | null;
  isEnabled: boolean;
}

function PlatformCard({
  platform,
  pixelData,
  onSave,
  onTest,
}: {
  platform: PlatformDef;
  pixelData?: PixelData;
  onSave: (data: { platform: string; pixelId: string; accessToken: string; isEnabled: boolean }) => void;
  onTest: (platform: string) => void;
}) {
  const [pixelId, setPixelId] = useState(pixelData?.pixelId || "");
  const [accessToken, setAccessToken] = useState(pixelData?.accessToken === "***" ? "" : (pixelData?.accessToken || ""));
  const [isEnabled, setIsEnabled] = useState(pixelData?.isEnabled || false);
  const [showToken, setShowToken] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [isDirty, setIsDirty] = useState(false);

  const isConfigured = !!(pixelData?.pixelId);
  const statusBadge = isConfigured && isEnabled
    ? { label: "Connected", icon: <CheckCircle2 className="w-3 h-3" />, variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200" }
    : isConfigured && !isEnabled
    ? { label: "Disabled", icon: <AlertTriangle className="w-3 h-3" />, variant: "secondary" as const, className: "bg-yellow-100 text-yellow-700 border-yellow-200" }
    : { label: "Not Configured", icon: <XCircle className="w-3 h-3" />, variant: "outline" as const, className: "bg-gray-100 text-gray-500 border-gray-200" };

  const handleTest = async () => {
    setTestStatus("sending");
    try {
      await onTest(platform.key);
      setTestStatus("sent");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  };

  const handleSave = () => {
    onSave({ platform: platform.key, pixelId, accessToken, isEnabled });
    setIsDirty(false);
  };

  return (
    <Card className="border border-gray-200 hover:border-gray-300 transition-all duration-200 overflow-hidden">
      {/* Header stripe */}
      <div className="h-1" style={{ backgroundColor: platform.color }} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
              style={{ backgroundColor: platform.bgColor }}
            >
              {platform.icon}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-gray-900 leading-tight">
                {platform.name}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{platform.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={statusBadge.variant}
              className={`text-xs flex items-center gap-1 ${statusBadge.className}`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between py-1 px-3 bg-gray-50 rounded-lg">
          <Label className="text-sm font-medium cursor-pointer" htmlFor={`toggle-${platform.key}`}>
            Enable {platform.name.split(" ")[0]} tracking
          </Label>
          <Switch
            id={`toggle-${platform.key}`}
            checked={isEnabled}
            onCheckedChange={(v) => { setIsEnabled(v); setIsDirty(true); }}
          />
        </div>

        {/* Pixel ID */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">{platform.pixelLabel}</Label>
          <Input
            placeholder={`Enter ${platform.pixelLabel}`}
            value={pixelId}
            onChange={(e) => { setPixelId(e.target.value); setIsDirty(true); }}
            className="h-8 text-sm font-mono"
          />
        </div>

        {/* Access Token */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">
            {platform.tokenLabel}
            {platform.hasServerSide && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-normal">
                Server-side CAPI
              </span>
            )}
          </Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              placeholder={`Enter ${platform.tokenLabel}`}
              value={accessToken}
              onChange={(e) => { setAccessToken(e.target.value); setIsDirty(true); }}
              className="h-8 text-sm font-mono pr-9"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className="h-7 text-xs flex-1"
            style={{ backgroundColor: isDirty ? "#C9A84C" : undefined, color: isDirty ? "#3E1F00" : undefined }}
          >
            Save Changes
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={!isConfigured || testStatus === "sending"}
            className="h-7 text-xs"
            title="Fire a test PageView event"
          >
            {testStatus === "sending" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : testStatus === "sent" ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> Sent ✅
              </span>
            ) : testStatus === "error" ? (
              <span className="text-red-500">Error ❌</span>
            ) : (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> Test
              </span>
            )}
          </Button>

          <a
            href={platform.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2 inline-flex items-center justify-center text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors text-gray-600"
            title="Open platform dashboard"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTracking() {
  const { data: pixels, refetch } = trpc.tracking.list.useQuery();
  const upsertMutation = trpc.tracking.upsert.useMutation({
    onSuccess: () => {
      toast.success("Tracking pixel saved successfully");
      refetch();
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });
  const testMutation = trpc.tracking.testEvent.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Test event sent!");
      } else {
        toast.error(data.message || "Test failed — check configuration");
      }
    },
  });

  const getPixelData = (platformKey: string): PixelData | undefined => {
    const p = pixels?.find(px => px.platform === platformKey);
    if (!p) return undefined;
    return {
      platform: p.platform,
      pixelId: p.pixelId,
      accessToken: p.accessToken,
      isEnabled: p.isEnabled,
    };
  };

  const handleSave = (data: { platform: string; pixelId: string; accessToken: string; isEnabled: boolean }) => {
    upsertMutation.mutate({
      platform: data.platform,
      pixelId: data.pixelId || undefined,
      accessToken: data.accessToken || undefined,
      isEnabled: data.isEnabled,
    });
  };

  const handleTest = async (platform: string) => {
    await testMutation.mutateAsync({ platform });
  };

  // Summary stats
  const enabledCount = pixels?.filter(p => p.isEnabled && p.pixelId).length || 0;
  const configuredCount = pixels?.filter(p => p.pixelId).length || 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing Tracking</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage pixel integrations, conversion tracking, and server-side event mirroring
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">{configuredCount}</div>
                <div className="text-xs text-gray-500">Configured</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{PLATFORMS.length}</div>
                <div className="text-xs text-gray-500">Platforms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <span className="text-amber-500 text-lg shrink-0">ℹ️</span>
          <div className="text-sm text-amber-800">
            <strong>Cookie Consent Required:</strong> All tracking pixels only fire after the customer accepts cookies via the consent banner. Platforms marked with{" "}
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">Server-side CAPI</span>{" "}
            also mirror events server-side via the Conversions API for improved iOS 14+ accuracy.
          </div>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.key}
              platform={platform}
              pixelData={getPixelData(platform.key)}
              onSave={handleSave}
              onTest={handleTest}
            />
          ))}
        </div>

        {/* Event Reference */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Firing Reference</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Trigger</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Meta</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">GA4</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">TikTok</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Snap</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pinterest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { event: "PageView", trigger: "Every page load", meta: "PageView", ga4: "page_view", tt: "PageView", snap: "PAGE_VIEW", pin: "pagevisit" },
                  { event: "ViewContent", trigger: "/product/[slug]", meta: "ViewContent", ga4: "view_item", tt: "ViewContent", snap: "VIEW_CONTENT", pin: "pagevisit" },
                  { event: "AddToCart", trigger: "Add to Cart button", meta: "AddToCart", ga4: "add_to_cart", tt: "AddToCart", snap: "ADD_CART", pin: "addtocart" },
                  { event: "InitiateCheckout", trigger: "/checkout page", meta: "InitiateCheckout", ga4: "begin_checkout", tt: "InitiateCheckout", snap: "START_CHECKOUT", pin: "checkout" },
                  { event: "Purchase", trigger: "Order confirmed", meta: "Purchase", ga4: "purchase", tt: "CompletePayment", snap: "PURCHASE", pin: "checkout" },
                  { event: "Search", trigger: "Search performed", meta: "Search", ga4: "search", tt: "Search", snap: "SEARCH", pin: "—" },
                  { event: "CompleteRegistration", trigger: "OTP verified", meta: "CompleteRegistration", ga4: "sign_up", tt: "CompleteRegistration", snap: "SIGN_UP", pin: "signup" },
                ].map((row) => (
                  <tr key={row.event} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{row.event}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{row.trigger}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-blue-700">{row.meta}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-orange-700">{row.ga4}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-700">{row.tt}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-yellow-700">{row.snap}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-red-700">{row.pin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
