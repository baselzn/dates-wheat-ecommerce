import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: number;
  variantId?: number;
  productNameEn: string;
  productNameAr: string;
  variantName?: string;
  productImage?: string;
  unitPrice: number;
  quantity: number;
  slug: string;
}

interface CartStore {
  items: CartItem[];
  couponCode: string;
  discountAmount: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, variantId: number | undefined, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  getSubtotal: () => number;
  getVat: () => number;
  getShipping: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const VAT_RATE = 0.05;
const FREE_SHIPPING_THRESHOLD = 200;
const SHIPPING_COST = 25;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: "",
      discountAmount: 0,
      isCartOpen: false,
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === newItem.productId && i.variantId === newItem.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId && i.variantId === newItem.variantId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [], couponCode: "", discountAmount: 0 }),

      applyCoupon: (code, discount) => set({ couponCode: code, discountAmount: discount }),

      removeCoupon: () => set({ couponCode: "", discountAmount: 0 }),

      getSubtotal: () => {
        return get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      },

      getVat: () => {
        const afterDiscount = get().getSubtotal() - get().discountAmount;
        return Math.max(0, afterDiscount) * VAT_RATE;
      },

      getShipping: () => {
        const afterDiscount = get().getSubtotal() - get().discountAmount;
        return afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().discountAmount;
        const afterDiscount = Math.max(0, subtotal - discount);
        const vat = afterDiscount * VAT_RATE;
        const shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
        return afterDiscount + vat + shipping;
      },

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    {
      name: "dw-cart",
    }
  )
);
