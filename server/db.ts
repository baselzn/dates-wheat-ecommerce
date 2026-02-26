import { and, desc, eq, gte, ilike, inArray, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  addresses,
  cartItems,
  categories,
  coupons,
  discountRules,
  InsertUser,
  orderItems,
  orders,
  otpSessions,
  pageViews,
  productVariants,
  products,
  reviews,
  storeSettings,
  trackingPixels,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    (values as Record<string, unknown>)[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getAllUsers(page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  const offset = (page - 1) * limit;
  const [rows, countResult] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);
  return { users: rows, total: Number(countResult[0]?.count ?? 0) };
}

// ─── OTP ─────────────────────────────────────────────────────────────────────
export async function createOtpSession(phone: string, code: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await db.insert(otpSessions).values({ phone, code, expiresAt });
}

export async function verifyOtp(phone: string, code: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.phone, phone),
        eq(otpSessions.code, code),
        eq(otpSessions.verified, false),
        gte(otpSessions.expiresAt, new Date())
      )
    )
    .limit(1);
  if (result.length === 0) return false;
  await db.update(otpSessions).set({ verified: true }).where(eq(otpSessions.id, result[0].id));
  return true;
}

// ─── Categories ──────────────────────────────────────────────────────────────
export async function getCategories(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(categories);
  if (activeOnly) {
    return query.where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
  }
  return query.orderBy(categories.sortOrder);
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result[0];
}

export async function upsertCategory(data: {
  id?: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(categories).set(data).where(eq(categories.id, data.id));
    return data.id;
  }
  await db.insert(categories).values(data);
  const [[{ lid: catId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(catId);
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ProductFilters {
  categoryId?: number;
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isGlutenFree?: boolean;
  isSugarFree?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "price_asc" | "price_desc" | "newest" | "popular";
}

export async function getProducts(filters: ProductFilters = {}) {
  const db = await getDb();
  if (!db) return { products: [], total: 0 };

  const {
    categoryId,
    categorySlug,
    search,
    minPrice,
    maxPrice,
    isGlutenFree,
    isSugarFree,
    isFeatured,
    isActive = true,
    page = 1,
    limit = 12,
    sortBy = "newest",
  } = filters;

  const conditions = [];
  if (isActive !== undefined) conditions.push(eq(products.isActive, isActive));
  if (isFeatured !== undefined) conditions.push(eq(products.isFeatured, isFeatured));
  if (isGlutenFree) conditions.push(eq(products.isGlutenFree, true));
  if (isSugarFree) conditions.push(eq(products.isSugarFree, true));
  if (minPrice !== undefined) conditions.push(gte(products.basePrice, String(minPrice)));
  if (maxPrice !== undefined) conditions.push(lte(products.basePrice, String(maxPrice)));
  if (search) {
    conditions.push(
      or(
        like(products.nameEn, `%${search}%`),
        like(products.nameAr, `%${search}%`)
      )
    );
  }

  // Handle category filter
  let catId = categoryId;
  if (!catId && categorySlug) {
    const cat = await getCategoryBySlug(categorySlug);
    catId = cat?.id;
  }
  if (catId) conditions.push(eq(products.categoryId, catId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  let orderByClause;
  switch (sortBy) {
    case "price_asc": orderByClause = products.basePrice; break;
    case "price_desc": orderByClause = desc(products.basePrice); break;
    default: orderByClause = desc(products.createdAt);
  }

  const [rows, countResult] = await Promise.all([
    db.select().from(products).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
  ]);

  return { products: rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result[0];
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getProductVariants(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(productVariants.sortOrder);
}

export async function upsertProduct(data: {
  id?: number;
  categoryId: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn?: string;
  descriptionAr?: string;
  basePrice: string;
  comparePrice?: string;
  images?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isGlutenFree?: boolean;
  isSugarFree?: boolean;
  isVegan?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  sku?: string;
  tags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(products).set(rest).where(eq(products.id, id));
    return id;
  }
  await db.insert(products).values(data);
  const [[{ lid: prodId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(prodId);
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(products).where(eq(products.id, id));
}

export async function upsertProductVariant(data: {
  id?: number;
  productId: number;
  nameEn: string;
  nameAr: string;
  price: string;
  comparePrice?: string;
  stockQty?: number;
  sku?: string;
  isDefault?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(productVariants).set(rest).where(eq(productVariants.id, id));
    return id;
  }
  await db.insert(productVariants).values(data);
  const [[{ lid: varId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(varId);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function getProductReviews(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true))).orderBy(desc(reviews.createdAt));
}

export async function createReview(data: {
  productId: number;
  userId: number;
  orderId?: number;
  rating: number;
  titleEn?: string;
  bodyEn?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(reviews).values(data);
}

// ─── Coupons ──────────────────────────────────────────────────────────────────
export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
  return result[0];
}

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function upsertCoupon(data: {
  id?: number;
  code: string;
  type: "percentage" | "fixed";
  value: string;
  minOrderAmount?: string;
  maxUses?: number;
  isActive?: boolean;
  expiresAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(coupons).set(rest).where(eq(coupons.id, id));
    return id;
  }
  await db.insert(coupons).values(data);
  const [[{ lid: couponId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(couponId);
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(coupons).where(eq(coupons.id, id));
}

export async function getUsersWithOrderStats(page = 1, limit = 20, search?: string) {
  const db = await getDb();
  if (!db) return { customers: [], total: 0 };
  const offset = (page - 1) * limit;
  const conditions = search ? [or(like(users.name, `%${search}%`), like(users.email, `%${search}%`), like(users.phone, `%${search}%`))] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countResult] = await Promise.all([
    db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause),
  ]);
  const customersWithStats = await Promise.all(rows.map(async (u) => {
    const orderStats = await db!.select({
      orderCount: sql<number>`COUNT(*)`,
      totalSpent: sql<number>`COALESCE(SUM(total), 0)`,
    }).from(orders).where(and(eq(orders.userId, u.id), eq(orders.paymentStatus, 'paid')));
    return { ...u, orderCount: Number(orderStats[0]?.orderCount ?? 0), totalSpent: Number(orderStats[0]?.totalSpent ?? 0) };
  }));
  return { customers: customersWithStats, total: Number(countResult[0]?.count ?? 0) };
}

export async function incrementCouponUsage(code: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(coupons).set({ usedCount: sql`usedCount + 1` }).where(eq(coupons.code, code));
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function createOrder(data: {
  orderNumber: string;
  userId?: number;
  guestEmail?: string;
  guestPhone?: string;
  paymentMethod: "stripe" | "cod";
  subtotal: string;
  vatAmount: string;
  shippingAmount: string;
  discountAmount: string;
  total: string;
  couponCode?: string;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingEmirate: string;
  shippingCountry?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orders).values(data);
  const [[{ lid: orderId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(orderId);
}

export async function createOrderItems(items: {
  orderId: number;
  productId: number;
  variantId?: number;
  productNameEn: string;
  productNameAr: string;
  variantName?: string;
  productImage?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orderItems).values(items);
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getAllOrders(page = 1, limit = 20, status?: string) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };
  const offset = (page - 1) * limit;
  const conditions = status ? [eq(orders.status, status as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded")] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countResult] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
  ]);
  return { orders: rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function updateOrderStatus(id: number, status: string, paymentStatus?: string, trackingNumber?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const update: Record<string, unknown> = { status };
  if (paymentStatus) update.paymentStatus = paymentStatus;
  if (trackingNumber) update.trackingNumber = trackingNumber;
  await db.update(orders).set(update).where(eq(orders.id, id));
}

export async function updateOrderStripe(id: number, paymentIntentId: string, sessionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(orders).set({
    stripePaymentIntentId: paymentIntentId,
    stripeSessionId: sessionId,
    paymentStatus: "paid",
    status: "confirmed",
  }).where(eq(orders.id, id));
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getOrderAnalytics(days = 30) {
  const db = await getDb();
  if (!db) return { revenue: 0, orders: 0, avgOrder: 0 };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(total), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, since), eq(orders.paymentStatus, "paid")));
  const r = result[0];
  return {
    revenue: Number(r?.revenue ?? 0),
    orders: Number(r?.count ?? 0),
    avgOrder: r?.count ? Number(r.revenue) / Number(r.count) : 0,
  };
}

export async function getDailyRevenue(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      date: sql<string>`DATE(createdAt)`,
      revenue: sql<number>`COALESCE(SUM(total), 0)`,
      orders: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, since), eq(orders.paymentStatus, "paid")))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
}

export async function getTopProducts(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      productId: orderItems.productId,
      productNameEn: orderItems.productNameEn,
      totalQty: sql<number>`SUM(quantity)`,
      totalRevenue: sql<number>`SUM(totalPrice)`,
    })
    .from(orderItems)
    .groupBy(orderItems.productId, orderItems.productNameEn)
    .orderBy(desc(sql`SUM(quantity)`))
    .limit(limit);
}

// ─── Addresses ───────────────────────────────────────────────────────────────
export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault));
}

export async function upsertAddress(data: {
  id?: number;
  userId: number;
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  emirate: string;
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, data.userId));
  }
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(addresses).set(rest).where(eq(addresses.id, id));
    return id;
  }
  await db.insert(addresses).values(data);
  const [[{ lid: addrId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(addrId);
}

export async function deleteAddress(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
}

// ─── Store Settings ───────────────────────────────────────────────────────────
export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(storeSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeSettings);
}

// ─── Tracking Pixels ──────────────────────────────────────────────────────────
export async function getTrackingPixels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trackingPixels);
}

export async function upsertTrackingPixel(data: {
  platform: string;
  pixelId?: string;
  accessToken?: string;
  isEnabled?: boolean;
  config?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(trackingPixels).values(data).onDuplicateKeyUpdate({ set: data });
}

// ─── Page Views ───────────────────────────────────────────────────────────────
export async function logPageView(data: {
  sessionId: string;
  userId?: number;
  path: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(pageViews).values(data);
  } catch {
    // non-critical
  }
}

export async function getPageViewStats(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      date: sql<string>`DATE(createdAt)`,
      views: sql<number>`COUNT(*)`,
      uniqueSessions: sql<number>`COUNT(DISTINCT sessionId)`,
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalOrders: 0, totalCustomers: 0, totalProducts: 0, recentOrders: [], ordersByStatus: [], lowStockProducts: [] };
  const [revenueResult, ordersResult, customersResult, productsResult, recentOrdersResult, ordersByStatusResult, lowStockResult] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(total), 0)` }).from(orders).where(eq(orders.paymentStatus, "paid")),
    db.select({ count: sql<number>`COUNT(*)` }).from(orders),
    db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.role, "user")),
    db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.isActive, true)),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
    db.select({ status: orders.status, count: sql<number>`COUNT(*)` }).from(orders).groupBy(orders.status),
    db.select().from(products).where(and(eq(products.isActive, true), sql`stockQty <= lowStockThreshold`)).limit(10),
  ]);
  return {
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
    totalOrders: Number(ordersResult[0]?.count ?? 0),
    totalCustomers: Number(customersResult[0]?.count ?? 0),
    totalProducts: Number(productsResult[0]?.count ?? 0),
    recentOrders: recentOrdersResult,
    ordersByStatus: ordersByStatusResult.map(r => ({ status: r.status, count: Number(r.count) })),
    lowStockProducts: lowStockResult,
  };
}

// ─── Discount Rules ───────────────────────────────────────────────────────────
export async function getDiscountRules(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(discountRules).where(eq(discountRules.isActive, true)).orderBy(desc(discountRules.priority));
  }
  return db.select().from(discountRules).orderBy(desc(discountRules.priority));
}

export async function getDiscountRuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(discountRules).where(eq(discountRules.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertDiscountRule(data: {
  id?: number;
  name: string;
  description?: string;
  type: "cart_total" | "bogo" | "quantity_tier" | "category_discount" | "product_discount" | "user_role" | "first_order" | "free_shipping";
  isActive: boolean;
  priority: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  conditions: string;
  actions: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(discountRules).set({
      name: data.name,
      description: data.description,
      type: data.type,
      isActive: data.isActive,
      priority: data.priority,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      usageLimit: data.usageLimit ?? null,
      conditions: data.conditions,
      actions: data.actions,
    }).where(eq(discountRules.id, data.id));
    return data.id;
  }
  await db.insert(discountRules).values({
    name: data.name,
    description: data.description,
    type: data.type,
    isActive: data.isActive,
    priority: data.priority,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    usageLimit: data.usageLimit ?? null,
    usedCount: 0,
    conditions: data.conditions,
    actions: data.actions,
  });
  const [[{ lid: ruleId }]] = await db.execute('SELECT LAST_INSERT_ID() as lid') as unknown as [[{ lid: number }]];
  return Number(ruleId);
}

export async function deleteDiscountRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(discountRules).where(eq(discountRules.id, id));
}

export async function applyDiscountRules(params: {
  cartItems: Array<{ productId: number; categoryId: number; quantity: number; unitPrice: number; }>;
  subtotal: number;
  isFirstOrder?: boolean;
}): Promise<{ totalDiscount: number; appliedRules: Array<{ id: number; name: string; discount: number }> }> {
  const rules = await getDiscountRules(true);
  const now = new Date();
  let totalDiscount = 0;
  const appliedRules: Array<{ id: number; name: string; discount: number }> = [];

  for (const rule of rules) {
    if (rule.startsAt && new Date(rule.startsAt) > now) continue;
    if (rule.endsAt && new Date(rule.endsAt) < now) continue;
    if (rule.usageLimit && rule.usedCount >= rule.usageLimit) continue;

    let conditions: Record<string, unknown> = {};
    let actions: Record<string, unknown> = {};
    try { conditions = JSON.parse(rule.conditions); actions = JSON.parse(rule.actions); } catch { continue; }

    let discount = 0;
    switch (rule.type) {
      case "cart_total": {
        if (params.subtotal >= Number(conditions.minAmount ?? 0)) {
          discount = actions.discountType === "percentage"
            ? params.subtotal * (Number(actions.discountValue ?? 0) / 100)
            : Number(actions.discountValue ?? 0);
          if (actions.maxDiscount) discount = Math.min(discount, Number(actions.maxDiscount));
        }
        break;
      }
      case "quantity_tier": {
        const totalQty = params.cartItems.reduce((s, i) => s + i.quantity, 0);
        const tiers = (conditions.tiers as Array<{ minQty: number; discountPct: number }>) ?? [];
        const tier = tiers.filter(t => totalQty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
        if (tier) discount = params.subtotal * (tier.discountPct / 100);
        break;
      }
      case "category_discount": {
        const catItems = params.cartItems.filter(i => i.categoryId === Number(conditions.categoryId ?? 0));
        const catSubtotal = catItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        if (catSubtotal > 0) {
          discount = actions.discountType === "percentage"
            ? catSubtotal * (Number(actions.discountValue ?? 0) / 100)
            : Number(actions.discountValue ?? 0);
        }
        break;
      }
      case "product_discount": {
        const pItem = params.cartItems.find(i => i.productId === Number(conditions.productId ?? 0));
        if (pItem) {
          const pSub = pItem.unitPrice * pItem.quantity;
          discount = actions.discountType === "percentage"
            ? pSub * (Number(actions.discountValue ?? 0) / 100)
            : Number(actions.discountValue ?? 0);
        }
        break;
      }
      case "bogo": {
        const buyQty = Number(conditions.buyQty ?? 1);
        const getQty = Number(conditions.getQty ?? 1);
        const targetPid = conditions.productId ? Number(conditions.productId) : null;
        const eligible = targetPid ? params.cartItems.filter(i => i.productId === targetPid) : params.cartItems;
        for (const item of eligible) {
          const sets = Math.floor(item.quantity / (buyQty + getQty));
          discount += sets * getQty * item.unitPrice;
        }
        break;
      }
      case "first_order": {
        if (params.isFirstOrder) {
          discount = actions.discountType === "percentage"
            ? params.subtotal * (Number(actions.discountValue ?? 0) / 100)
            : Number(actions.discountValue ?? 0);
        }
        break;
      }
      case "free_shipping": {
        if (params.subtotal >= Number(conditions.minAmount ?? 0)) {
          discount = Number(actions.shippingDiscount ?? 0);
        }
        break;
      }
    }
    if (discount > 0) { totalDiscount += discount; appliedRules.push({ id: rule.id, name: rule.name, discount }); }
  }
  return { totalDiscount, appliedRules };
}
