import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  // Required stubs for appRouter to load
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserById: vi.fn(),
  getUserByPhone: vi.fn(),
  getUserByEmail: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
  createOtpSession: vi.fn(),
  verifyOtp: vi.fn(),
  getCategories: vi.fn().mockResolvedValue([
    { id: 1, nameEn: "Arabic Sweets", nameAr: "حلويات عربية", slug: "arabic-sweets", isActive: true, sortOrder: 1 },
  ]),
  getCategoryBySlug: vi.fn(),
  upsertCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getProducts: vi.fn().mockResolvedValue({ products: [], total: 0 }),
  getProductBySlug: vi.fn(),
  getProductById: vi.fn(),
  getProductVariants: vi.fn().mockResolvedValue([]),
  getProductReviews: vi.fn().mockResolvedValue([]),
  upsertProduct: vi.fn().mockResolvedValue(42),
  deleteProduct: vi.fn(),
  upsertProductVariant: vi.fn(),
  createOrder: vi.fn(),
  createOrderItems: vi.fn(),
  getOrderById: vi.fn(),
  getOrderByNumber: vi.fn(),
  getOrderItems: vi.fn(),
  getUserOrders: vi.fn().mockResolvedValue([]),
  getAllOrders: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
  updateOrderStatus: vi.fn(),
  updateOrderStripe: vi.fn(),
  getAllCoupons: vi.fn().mockResolvedValue([]),
  getCouponByCode: vi.fn(),
  upsertCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
  incrementCouponUsage: vi.fn(),
  getUserAddresses: vi.fn().mockResolvedValue([]),
  upsertAddress: vi.fn(),
  deleteAddress: vi.fn(),
  createReview: vi.fn(),
  getAllSettings: vi.fn().mockResolvedValue([]),
  setSetting: vi.fn(),
  getDashboardStats: vi.fn().mockResolvedValue({}),
  getDailyRevenue: vi.fn().mockResolvedValue([]),
  getTopProducts: vi.fn().mockResolvedValue([]),
  getOrderAnalytics: vi.fn().mockResolvedValue({}),
  getUsersWithOrderStats: vi.fn().mockResolvedValue({ users: [], total: 0 }),
  getTrackingPixels: vi.fn().mockResolvedValue([]),
  upsertTrackingPixel: vi.fn(),
  logPageView: vi.fn(),
  getPageViewStats: vi.fn().mockResolvedValue([]),
  // Discount rules
  getDiscountRules: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "10% Off Orders Over AED 200",
      type: "cart_total",
      isActive: true,
      priority: 10,
      conditions: JSON.stringify({ minCartTotal: 200 }),
      actions: JSON.stringify({ discountType: "percentage", discountValue: 10 }),
      usedCount: 0,
    },
    {
      id: 2,
      name: "Buy 2 Get 1 Free",
      type: "bogo",
      isActive: true,
      priority: 20,
      conditions: JSON.stringify({ minQuantity: 2 }),
      actions: JSON.stringify({ discountType: "free_item", discountValue: 1 }),
      usedCount: 5,
    },
  ]),
  getDiscountRuleById: vi.fn().mockResolvedValue({
    id: 1,
    name: "10% Off Orders Over AED 200",
    type: "cart_total",
    isActive: true,
    priority: 10,
    conditions: JSON.stringify({ minCartTotal: 200 }),
    actions: JSON.stringify({ discountType: "percentage", discountValue: 10 }),
    usedCount: 0,
  }),
  upsertDiscountRule: vi.fn().mockResolvedValue(1),
  deleteDiscountRule: vi.fn(),
  applyDiscountRules: vi.fn().mockResolvedValue({
    discounts: [{ ruleId: 1, ruleName: "10% Off", discountAmount: 25, type: "cart_total" }],
    totalDiscount: 25,
    freeShipping: false,
  }),
}));

vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

// ─── Admin context ────────────────────────────────────────────────────────────
const adminCtx: TrpcContext = {
  user: { id: 1, name: "Admin", email: "admin@test.com", role: "admin", openId: "admin-open-id" },
  req: { headers: {} } as never,
  res: {} as never,
};

const publicCtx: TrpcContext = {
  user: null,
  req: { headers: {} } as never,
  res: {} as never,
};

// ─── Discount Rules Tests ─────────────────────────────────────────────────────
describe("Discount Rules", () => {
  it("list returns all discount rules for admin", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const rules = await caller.discountRules.list();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBe(2);
    expect(rules[0].name).toBe("10% Off Orders Over AED 200");
    expect(rules[1].type).toBe("bogo");
  });

  it("list is protected — requires admin", async () => {
    const caller = appRouter.createCaller(publicCtx);
    await expect(caller.discountRules.list()).rejects.toThrow();
  });

  it("upsert creates a new discount rule", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.discountRules.upsert({
      name: "Free Shipping Over AED 300",
      type: "free_shipping",
      isActive: true,
      priority: 5,
      conditions: JSON.stringify({ minCartTotal: 300 }),
      actions: JSON.stringify({ freeShipping: true }),
    });
    expect(result).toBe(1);
  });

  it("delete removes a discount rule", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(caller.discountRules.delete(1)).resolves.not.toThrow();
  });

  it("calculate applies discount rules to cart", async () => {
    const caller = appRouter.createCaller(publicCtx);
    const result = await caller.discountRules.calculate({
      cartItems: [
        { productId: 1, categoryId: 1, quantity: 3, unitPrice: 85 },
      ],
      subtotal: 255,
      isFirstOrder: false,
    });
    expect(result).toHaveProperty("totalDiscount");
    expect(result.totalDiscount).toBe(25);
    expect(result.discounts[0].ruleName).toBe("10% Off");
  });
});

// ─── WooCommerce Importer Tests ───────────────────────────────────────────────
describe("WooCommerce Importer", () => {
  it("testConnection is protected — requires admin", async () => {
    const caller = appRouter.createCaller(publicCtx);
    await expect(caller.woocommerce.testConnection({
      storeUrl: "https://example.com",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
    })).rejects.toThrow();
  });

  it("importProducts imports products and returns results", async () => {
    // Mock fetch for WooCommerce API
    const mockProduct = {
      id: 101,
      name: "Maamoul Box",
      slug: "maamoul-box",
      status: "publish",
      description: "<p>Delicious Maamoul</p>",
      short_description: "Premium Maamoul",
      sku: "MAM-001",
      price: "75.00",
      regular_price: "85.00",
      sale_price: "75.00",
      stock_quantity: 50,
      in_stock: true,
      images: [{ id: 1, src: "https://example.com/maamoul.jpg", alt: "Maamoul" }],
      categories: [{ id: 5, name: "Arabic Sweets", slug: "arabic-sweets" }],
      tags: [{ id: 1, name: "traditional", slug: "traditional" }],
      attributes: [],
      variations: [],
      weight: "0.5",
      dimensions: { length: "20", width: "15", height: "5" },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProduct,
      headers: { get: () => null },
    } as unknown as Response);

    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.woocommerce.importProducts({
      storeUrl: "https://example.com",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      productIds: [101],
      defaultCategoryId: 1,
      importImages: true,
    });

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].status).toBe("imported");
    expect(result.results[0].name).toBe("Maamoul Box");
  });

  it("fetchCategories returns WooCommerce categories", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: "Arabic Sweets", slug: "arabic-sweets", count: 12, image: null },
        { id: 2, name: "Gift Boxes", slug: "gift-boxes", count: 5, image: null },
        { id: 99, name: "Uncategorized", slug: "uncategorized", count: 0, image: null },
      ],
      headers: { get: () => null },
    } as unknown as Response);

    const caller = appRouter.createCaller(adminCtx);
    const cats = await caller.woocommerce.fetchCategories({
      storeUrl: "https://example.com",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
    });

    // Should filter out "uncategorized"
    expect(cats.length).toBe(2);
    expect(cats.find(c => c.slug === "uncategorized")).toBeUndefined();
    expect(cats[0].name).toBe("Arabic Sweets");
  });
});
