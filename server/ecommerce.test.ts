import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
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
    { id: 2, nameEn: "Gluten Free", nameAr: "خالي من الغلوتين", slug: "gluten-free", isActive: true, sortOrder: 2 },
  ]),
  getCategoryBySlug: vi.fn(),
  upsertCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getProducts: vi.fn().mockResolvedValue({
    products: [
      { id: 1, nameEn: "Mix مشكل", nameAr: "مشكل", slug: "mix-mushakkal", basePrice: "55.00", isActive: true, isFeatured: true, images: "[]" },
      { id: 2, nameEn: "Maamoul معمول", nameAr: "معمول", slug: "maamoul", basePrice: "65.00", isActive: true, isFeatured: true, images: "[]" },
    ],
    total: 2,
  }),
  getProductBySlug: vi.fn().mockResolvedValue({ id: 1, nameEn: "Mix مشكل", slug: "mix-mushakkal", basePrice: "55.00", images: "[]" }),
  getProductById: vi.fn(),
  getProductVariants: vi.fn().mockResolvedValue([
    { id: 1, productId: 1, nameEn: "250g", price: "55.00", stockQty: 30 },
    { id: 2, productId: 1, nameEn: "500g", price: "75.00", stockQty: 25 },
  ]),
  upsertProduct: vi.fn().mockResolvedValue(1),
  deleteProduct: vi.fn(),
  upsertProductVariant: vi.fn(),
  getProductReviews: vi.fn().mockResolvedValue([]),
  createReview: vi.fn(),
  getCouponByCode: vi.fn(),
  getAllCoupons: vi.fn().mockResolvedValue([
    { id: 1, code: "WELCOME10", type: "percentage", value: "10.00", isActive: true, usedCount: 0 },
    { id: 2, code: "FLAT25", type: "fixed", value: "25.00", isActive: true, usedCount: 5 },
  ]),
  upsertCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
  incrementCouponUsage: vi.fn(),
  createOrder: vi.fn().mockResolvedValue(42),
  createOrderItems: vi.fn(),
  getOrderById: vi.fn().mockResolvedValue({ id: 42, orderNumber: "DW-TEST-001", total: "100.00", status: "pending" }),
  getOrderByNumber: vi.fn(),
  getOrderItems: vi.fn().mockResolvedValue([]),
  getUserOrders: vi.fn().mockResolvedValue([]),
  getAllOrders: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
  updateOrderStatus: vi.fn(),
  updateOrderStripe: vi.fn(),
  getOrderAnalytics: vi.fn().mockResolvedValue({ revenue: 5000, orders: 42, avgOrder: 119 }),
  getDailyRevenue: vi.fn().mockResolvedValue([]),
  getTopProducts: vi.fn().mockResolvedValue([]),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalRevenue: 15000,
    totalOrders: 120,
    totalCustomers: 85,
    totalProducts: 16,
    recentOrders: [],
    ordersByStatus: [{ status: "pending", count: 5 }],
    lowStockProducts: [],
  }),
  getUserAddresses: vi.fn().mockResolvedValue([]),
  upsertAddress: vi.fn(),
  deleteAddress: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  getAllSettings: vi.fn().mockResolvedValue([
    { key: "store_name", value: "Dates & Wheat" },
    { key: "vat_rate", value: "5" },
  ]),
  getTrackingPixels: vi.fn().mockResolvedValue([]),
  upsertTrackingPixel: vi.fn(),
  logPageView: vi.fn(),
  getPageViewStats: vi.fn().mockResolvedValue([]),
  getUsersWithOrderStats: vi.fn().mockResolvedValue({ customers: [], total: 0 }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.jpg", key: "test.jpg" }),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────
type AuthUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user?: Partial<AuthUser>): TrpcContext {
  return {
    user: user ? {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...user,
    } as AuthUser : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return makeCtx({ role: "admin", openId: "admin-user" });
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx({ name: "Alice" }));
    const result = await caller.auth.me();
    expect(result?.name).toBe("Alice");
  });

  it("logout clears cookie and returns success", async () => {
    const ctx = makeCtx({ name: "Alice" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect((ctx.res.clearCookie as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });
});

// ─── Categories Tests ─────────────────────────────────────────────────────────
describe("categories", () => {
  it("list returns all active categories", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].nameEn).toBe("Arabic Sweets");
  });
});

// ─── Products Tests ───────────────────────────────────────────────────────────
describe("products", () => {
  it("list returns paginated products", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.products.list({});
    expect(result.products.length).toBe(2);
    expect(result.total).toBe(2);
  });

  it("list filters by search term", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.products.list({ search: "maamoul" });
    expect(result).toBeDefined();
  });

  it("bySlug returns product with variants", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.products.bySlug("mix-mushakkal");
    expect(result?.nameEn).toBe("Mix مشكل");
    expect(result?.variants?.length).toBe(2);
  });
});

// ─── Admin Tests ──────────────────────────────────────────────────────────────
describe("admin", () => {
  it("dashboardStats requires admin role", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.admin.dashboardStats()).rejects.toThrow();
  });

  it("dashboardStats returns KPIs for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.dashboardStats();
    expect(result.totalRevenue).toBe(15000);
    expect(result.totalOrders).toBe(120);
    expect(result.totalCustomers).toBe(85);
    expect(result.totalProducts).toBe(16);
  });

  it("admin.products.list returns product list", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.products.list();
    expect(result.products.length).toBe(2);
  });

  it("admin.orders.list returns orders", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.orders.list();
    expect(result).toBeDefined();
    expect(result.orders).toBeDefined();
  });

  it("admin.coupons.list returns all coupons", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.coupons.list();
    expect(result.length).toBe(2);
    expect(result[0].code).toBe("WELCOME10");
  });

  it("admin.settings.get returns store settings", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.settings.get();
    expect(result.storeName).toBe("Dates & Wheat");
    expect(result.vatRate).toBe(5);
  });

  it("admin.customers.list requires admin role", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.admin.customers.list()).rejects.toThrow();
  });
});

// ─── Orders Tests ─────────────────────────────────────────────────────────────
describe("orders", () => {
  it("create order returns order number", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.orders.create({
      paymentMethod: "cod",
      items: [{ productId: 1, quantity: 2, unitPrice: 55, productNameEn: "Mix", productNameAr: "مشكل" }],
      shippingFullName: "Test User",
      shippingPhone: "+971501234567",
      shippingAddressLine1: "123 Test St",
      shippingCity: "Fujairah",
      shippingEmirate: "Fujairah",
    });
    expect(result.orderNumber).toMatch(/^DW-/);
    expect(result.total).toBeGreaterThan(0);
  });

  it("byNumber returns order details", async () => {
    const { getOrderByNumber } = await import("./db");
    vi.mocked(getOrderByNumber).mockResolvedValueOnce({ id: 42, orderNumber: "DW-TEST-001", total: "100.00", status: "pending" } as never);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.orders.byNumber("DW-TEST-001");
    expect(result?.orderNumber).toBe("DW-TEST-001");
  });
});

// ─── Coupons Tests ────────────────────────────────────────────────────────────
describe("coupons", () => {
  it("validate returns error for non-existent coupon", async () => {
    const { getCouponByCode } = await import("./db");
    vi.mocked(getCouponByCode).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.coupons.validate({ code: "INVALID", orderAmount: 100 });
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it("validate applies percentage discount correctly", async () => {
    const { getCouponByCode } = await import("./db");
    vi.mocked(getCouponByCode).mockResolvedValueOnce({
      id: 1, code: "WELCOME10", type: "percentage", value: "10.00",
      minOrderAmount: "50.00", maxUses: 100, usedCount: 0, isActive: true,
      expiresAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.coupons.validate({ code: "WELCOME10", orderAmount: 200 });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(20); // 10% of 200
  });

  it("validate applies fixed discount correctly", async () => {
    const { getCouponByCode } = await import("./db");
    vi.mocked(getCouponByCode).mockResolvedValueOnce({
      id: 2, code: "FLAT25", type: "fixed", value: "25.00",
      minOrderAmount: "100.00", maxUses: 200, usedCount: 5, isActive: true,
      expiresAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.coupons.validate({ code: "FLAT25", orderAmount: 150 });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(25);
  });

  it("validate rejects coupon below minimum order amount", async () => {
    const { getCouponByCode } = await import("./db");
    vi.mocked(getCouponByCode).mockResolvedValueOnce({
      id: 1, code: "WELCOME10", type: "percentage", value: "10.00",
      minOrderAmount: "200.00", maxUses: 100, usedCount: 0, isActive: true,
      expiresAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.coupons.validate({ code: "WELCOME10", orderAmount: 100 });
    expect(result.valid).toBe(false);
    expect(result.message).toContain("200");
  });
});
