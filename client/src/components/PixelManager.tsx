/**
 * PixelManager — loads all enabled tracking pixels from DB config
 * and provides the usePixelTrack hook for firing events to all platforms.
 *
 * Architecture:
 *  1. On mount, fetches enabled tracking configs via tRPC
 *  2. Injects platform scripts dynamically (respects cookie consent)
 *  3. Exposes usePixelTrack(event, data) that fires to ALL enabled platforms
 *  4. Server-side CAPI mirroring for Meta + TikTok via tRPC mutation
 */

import { useEffect, useRef, useCallback, createContext, useContext, useState } from "react";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PixelEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search"
  | "CompleteRegistration"
  | "ViewCategory";

export interface PixelEventData extends Record<string, unknown> {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  search_string?: string;
  order_id?: string;
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  // GA4 specific
  item_id?: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
    item_category?: string;
  }>;
  transaction_id?: string;
  // Page tracking
  page_path?: string;
  page_title?: string;
}

interface TrackingConfig {
  platform: string;
  pixelId: string | null;
  accessToken: string | null;
  isEnabled: boolean;
}

interface PixelContextValue {
  track: (event: PixelEventName, data?: PixelEventData) => void;
  configs: TrackingConfig[];
  initialized: boolean;
  cookieConsent: boolean;
  setCookieConsent: (v: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PixelContext = createContext<PixelContextValue>({
  track: () => {},
  configs: [],
  initialized: false,
  cookieConsent: false,
  setCookieConsent: () => {},
});

export function usePixelTrack() {
  return useContext(PixelContext);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: {
      load: (id: string) => void;
      page: () => void;
      track: (event: string, data?: unknown) => void;
      identify: (data: unknown) => void;
    };
    snaptr?: (...args: unknown[]) => void;
    twq?: (...args: unknown[]) => void;
    pintrk?: (...args: unknown[]) => void;
  }
}

function injectScript(src: string, id: string, onLoad?: () => void) {
  if (document.getElementById(id)) {
    onLoad?.();
    return;
  }
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  if (onLoad) script.onload = onLoad;
  document.head.appendChild(script);
}

function injectInlineScript(code: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.innerHTML = code;
  document.head.appendChild(script);
}

// ─── Platform Initializers ────────────────────────────────────────────────────

function initMeta(pixelId: string) {
  injectInlineScript(
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
    "meta-pixel-init"
  );
}

function initGA4(measurementId: string, gtmId?: string) {
  if (gtmId) return; // GTM takes precedence
  injectScript(
    `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    "ga4-script",
    () => {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function (...args: unknown[]) {
        window.dataLayer!.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false });
    }
  );
}

function initGTM(containerId: string) {
  injectInlineScript(
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`,
    "gtm-init"
  );
}

function initGoogleAds(conversionId: string) {
  injectScript(
    `https://www.googletagmanager.com/gtag/js?id=${conversionId}`,
    "gads-script",
    () => {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function (...args: unknown[]) {
        window.dataLayer!.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", conversionId);
    }
  );
}

function initTikTok(pixelId: string) {
  injectInlineScript(
    `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelId}');ttq.page();}(window,document,'ttq');`,
    "tiktok-pixel-init"
  );
}

function initSnapchat(pixelId: string) {
  injectInlineScript(
    `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${pixelId}',{user_email:''});snaptr('track','PAGE_VIEW');`,
    "snapchat-pixel-init"
  );
}

function initTwitter(pixelId: string) {
  injectInlineScript(
    `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','${pixelId}');`,
    "twitter-pixel-init"
  );
}

function initPinterest(pixelId: string) {
  injectInlineScript(
    `!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load','${pixelId}');pintrk('page');`,
    "pinterest-pixel-init"
  );
}

// ─── Event Firers ─────────────────────────────────────────────────────────────

function fireMetaEvent(event: PixelEventName, data?: PixelEventData) {
  if (!window.fbq) return;
  const metaEvent = event === "ViewCategory" ? "ViewContent" : event;
  const params: Record<string, unknown> = {};
  if (data?.content_name) params.content_name = data.content_name;
  if (data?.content_ids) params.content_ids = data.content_ids;
  if (data?.value !== undefined) params.value = data.value;
  if (data?.currency) params.currency = data.currency;
  if (data?.num_items !== undefined) params.num_items = data.num_items;
  if (data?.search_string) params.search_string = data.search_string;
  if (data?.contents) params.contents = data.contents;
  params.content_type = data?.content_type || "product";
  window.fbq("track", metaEvent, params);
}

function fireGA4Event(event: PixelEventName, measurementId: string, data?: PixelEventData) {
  if (!window.gtag) return;
  const ga4Map: Record<PixelEventName, string> = {
    PageView: "page_view",
    ViewContent: "view_item",
    AddToCart: "add_to_cart",
    InitiateCheckout: "begin_checkout",
    Purchase: "purchase",
    Search: "search",
    CompleteRegistration: "sign_up",
    ViewCategory: "view_item_list",
  };
  const ga4Event = ga4Map[event];
  if (!ga4Event) return;
  const params: Record<string, unknown> = {};
  if (data?.items) params.items = data.items;
  if (data?.value !== undefined) params.value = data.value;
  if (data?.currency) params.currency = data.currency;
  if (data?.transaction_id) params.transaction_id = data.transaction_id;
  if (data?.search_string) params.search_term = data.search_string;
  if (data?.page_path) params.page_path = data.page_path;
  window.gtag("event", ga4Event, { ...params, send_to: measurementId });
}

function fireGTMEvent(event: PixelEventName, data?: PixelEventData) {
  if (!window.dataLayer) return;
  window.dataLayer.push({
    event: `dw_${event.toLowerCase()}`,
    ecommerce: data,
  });
}

function fireTikTokEvent(event: PixelEventName, data?: PixelEventData) {
  if (!window.ttq) return;
  const ttMap: Record<PixelEventName, string> = {
    PageView: "PageView",
    ViewContent: "ViewContent",
    AddToCart: "AddToCart",
    InitiateCheckout: "InitiateCheckout",
    Purchase: "CompletePayment",
    Search: "Search",
    CompleteRegistration: "CompleteRegistration",
    ViewCategory: "ViewContent",
  };
  const ttEvent = ttMap[event];
  if (!ttEvent) return;
  const params: Record<string, unknown> = {};
  if (data?.content_ids?.length) params.content_id = data.content_ids[0];
  if (data?.content_name) params.content_name = data.content_name;
  if (data?.value !== undefined) params.value = data.value;
  if (data?.currency) params.currency = data.currency;
  window.ttq.track(ttEvent, params);
}

function fireSnapchatEvent(event: PixelEventName, data?: PixelEventData) {
  if (!window.snaptr) return;
  const snapMap: Record<PixelEventName, string> = {
    PageView: "PAGE_VIEW",
    ViewContent: "VIEW_CONTENT",
    AddToCart: "ADD_CART",
    InitiateCheckout: "START_CHECKOUT",
    Purchase: "PURCHASE",
    Search: "SEARCH",
    CompleteRegistration: "SIGN_UP",
    ViewCategory: "VIEW_CONTENT",
  };
  const snapEvent = snapMap[event];
  if (!snapEvent) return;
  const params: Record<string, unknown> = {};
  if (data?.value !== undefined) params.price = data.value;
  if (data?.currency) params.currency = data.currency;
  if (data?.content_ids?.length) params.item_ids = data.content_ids;
  window.snaptr("track", snapEvent, params);
}

function fireTwitterEvent(event: PixelEventName, data?: PixelEventData) {
  if (!window.twq) return;
  if (event === "Purchase") {
    window.twq("event", "tw-purchase", {
      value: data?.value,
      currency: data?.currency || "AED",
      num_items: data?.num_items,
    });
  } else if (event === "PageView") {
    window.twq("track", "PageView");
  }
}

function firePinterestEvent(event: PixelEventName, data?: PixelEventData) {
  if (!window.pintrk) return;
  const pinMap: Record<PixelEventName, string> = {
    PageView: "pagevisit",
    ViewContent: "pagevisit",
    AddToCart: "addtocart",
    InitiateCheckout: "checkout",
    Purchase: "checkout",
    Search: "search",
    CompleteRegistration: "signup",
    ViewCategory: "viewcategory",
  };
  const pinEvent = pinMap[event];
  if (!pinEvent) return;
  const params: Record<string, unknown> = {};
  if (data?.value !== undefined) params.value = data.value;
  if (data?.currency) params.currency = data.currency;
  if (data?.order_id) params.order_id = data.order_id;
  window.pintrk("track", pinEvent, params);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PixelManagerProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [cookieConsent, setCookieConsentState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dw_cookie_consent") === "true";
    } catch {
      return false;
    }
  });
  const configsRef = useRef<TrackingConfig[]>([]);

  const { data: pixelConfigs } = trpc.tracking.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const mirrorMeta = trpc.tracking.mirrorMeta.useMutation();
  const mirrorTikTok = trpc.tracking.mirrorTikTok.useMutation();

  const setCookieConsent = useCallback((v: boolean) => {
    setCookieConsentState(v);
    try {
      localStorage.setItem("dw_cookie_consent", v ? "true" : "false");
    } catch {}
  }, []);

  // Initialize platform scripts when configs load and consent given
  useEffect(() => {
    if (!pixelConfigs || !cookieConsent) return;
    configsRef.current = pixelConfigs;

    const gtmConfig = pixelConfigs.find(c => c.platform === "gtm" && c.isEnabled && c.pixelId);
    const metaConfig = pixelConfigs.find(c => c.platform === "meta" && c.isEnabled && c.pixelId);
    const ga4Config = pixelConfigs.find(c => c.platform === "ga4" && c.isEnabled && c.pixelId);
    const gadsConfig = pixelConfigs.find(c => c.platform === "google_ads" && c.isEnabled && c.pixelId);
    const ttConfig = pixelConfigs.find(c => c.platform === "tiktok" && c.isEnabled && c.pixelId);
    const snapConfig = pixelConfigs.find(c => c.platform === "snapchat" && c.isEnabled && c.pixelId);
    const twConfig = pixelConfigs.find(c => c.platform === "twitter" && c.isEnabled && c.pixelId);
    const pinConfig = pixelConfigs.find(c => c.platform === "pinterest" && c.isEnabled && c.pixelId);

    if (gtmConfig?.pixelId) initGTM(gtmConfig.pixelId);
    if (metaConfig?.pixelId) initMeta(metaConfig.pixelId);
    if (ga4Config?.pixelId) initGA4(ga4Config.pixelId, gtmConfig?.pixelId ?? undefined);
    if (gadsConfig?.pixelId) initGoogleAds(gadsConfig.pixelId);
    if (ttConfig?.pixelId) initTikTok(ttConfig.pixelId);
    if (snapConfig?.pixelId) initSnapchat(snapConfig.pixelId);
    if (twConfig?.pixelId) initTwitter(twConfig.pixelId);
    if (pinConfig?.pixelId) initPinterest(pinConfig.pixelId);

    setInitialized(true);
  }, [pixelConfigs, cookieConsent]);

  const track = useCallback(
    (event: PixelEventName, data?: PixelEventData) => {
      if (!cookieConsent) return;
      const configs = configsRef.current;

      const getConfig = (platform: string) =>
        configs.find(c => c.platform === platform && c.isEnabled && c.pixelId);

      const metaConfig = getConfig("meta");
      const ga4Config = getConfig("ga4");
      const gtmConfig = getConfig("gtm");
      const ttConfig = getConfig("tiktok");
      const snapConfig = getConfig("snapchat");
      const twConfig = getConfig("twitter");
      const pinConfig = getConfig("pinterest");

      // Client-side fires
      if (metaConfig) fireMetaEvent(event, data);
      if (ga4Config) fireGA4Event(event, ga4Config.pixelId!, data);
      if (gtmConfig) fireGTMEvent(event, data);
      if (ttConfig) fireTikTokEvent(event, data);
      if (snapConfig) fireSnapchatEvent(event, data);
      if (twConfig) fireTwitterEvent(event, data);
      if (pinConfig) firePinterestEvent(event, data);

      // Server-side CAPI mirroring (Meta + TikTok)
      if (metaConfig?.accessToken && metaConfig.pixelId) {
        mirrorMeta.mutate({
          pixelId: metaConfig.pixelId,
          accessToken: metaConfig.accessToken,
          eventName: event,
          eventData: data ?? {},
          sourceUrl: window.location.href,
        });
      }
      if (ttConfig?.accessToken && ttConfig.pixelId) {
        mirrorTikTok.mutate({
          pixelId: ttConfig.pixelId,
          accessToken: ttConfig.accessToken,
          eventName: event,
          eventData: data ?? {},
          sourceUrl: window.location.href,
        });
      }
    },
    [cookieConsent, mirrorMeta, mirrorTikTok]
  );

  return (
    <PixelContext.Provider
      value={{ track, configs: configsRef.current, initialized, cookieConsent, setCookieConsent }}
    >
      {children}
      {/* Cookie Consent Banner */}
      {!cookieConsent && (
        <CookieConsentBanner onAccept={() => setCookieConsent(true)} onDecline={() => setCookieConsent(false)} />
      )}
    </PixelContext.Provider>
  );
}

// ─── Cookie Consent Banner ────────────────────────────────────────────────────

function CookieConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#3E1F00] text-white p-4 shadow-2xl"
      style={{ borderTop: "3px solid #C9A84C" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex-1 text-sm">
          <span className="font-semibold text-[#C9A84C]">🍪 Cookie Preferences</span>
          <span className="ml-2 text-gray-200">
            We use cookies and tracking technologies to improve your experience and show you relevant products.
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { onDecline(); setDismissed(true); }}
            className="px-4 py-2 text-sm border border-gray-500 rounded hover:border-gray-300 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => { onAccept(); setDismissed(true); }}
            className="px-4 py-2 text-sm bg-[#C9A84C] text-[#3E1F00] font-semibold rounded hover:bg-[#E8D5A3] transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
