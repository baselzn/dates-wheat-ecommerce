/**
 * useRecentlyViewed — localStorage-backed recently viewed products tracker.
 * Stores up to 10 products. Each entry has the minimum data needed to render a ProductCard.
 */

const STORAGE_KEY = "dw_recently_viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedProduct {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  basePrice: string | number;
  comparePrice?: string | number | null;
  images?: string[];
  isGlutenFree?: boolean;
  isSugarFree?: boolean;
  stockQty?: number;
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedProduct[];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(product: RecentlyViewedProduct): void {
  try {
    const current = getRecentlyViewed().filter((p) => p.id !== product.id);
    const updated = [product, ...current].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded)
  }
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
