import { useEffect } from "react";

interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "Dates & Wheat | تمر وقمح";
const BASE_URL = window.location.origin;

export function usePageMeta({ title, description, image, canonical, jsonLd }: PageMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    // Helper to set or create a meta tag
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        const [attrName, attrVal] = selector.replace("meta[", "").replace("]", "").split("=");
        el.setAttribute(attrName.trim(), attrVal.replace(/"/g, "").trim());
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    if (description) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[name="twitter:description"]', "content", description);
    }

    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);

    if (image) {
      setMeta('meta[property="og:image"]', "content", image);
      setMeta('meta[name="twitter:image"]', "content", image);
    }

    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : `${BASE_URL}${window.location.pathname}`;
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonicalUrl);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[name="twitter:url"]', "content", canonicalUrl);

    // JSON-LD structured data
    const existingJsonLd = document.querySelector('script[data-page-jsonld]');
    if (jsonLd) {
      const script = existingJsonLd || document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-page-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      if (!existingJsonLd) document.head.appendChild(script);
    } else if (existingJsonLd) {
      existingJsonLd.remove();
    }

    // Cleanup on unmount — restore defaults
    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description, image, canonical, jsonLd]);
}
