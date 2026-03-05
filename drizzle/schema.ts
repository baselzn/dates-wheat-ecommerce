import {
  bigint,
  boolean,
  date,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── OTP Sessions ────────────────────────────────────────────────────────────
export const otpSessions = mysqlTable("otp_sessions", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  code: varchar("code", { length: 8 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Addresses ───────────────────────────────────────────────────────────────
export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 64 }).default("Home"),
  fullName: varchar("fullName", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  addressLine1: text("addressLine1").notNull(),
  addressLine2: text("addressLine2"),
  city: varchar("city", { length: 64 }).notNull(),
  emirate: varchar("emirate", { length: 64 }).notNull(),
  country: varchar("country", { length: 64 }).default("UAE").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  mapAddress: text("mapAddress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Categories ──────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  nameAr: varchar("nameAr", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  nameEn: varchar("nameEn", { length: 256 }).notNull(),
  nameAr: varchar("nameAr", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("comparePrice", { precision: 10, scale: 2 }),
  images: text("images"),
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isGlutenFree: boolean("isGlutenFree").default(false).notNull(),
  isSugarFree: boolean("isSugarFree").default(false).notNull(),
  isVegan: boolean("isVegan").default(false).notNull(),
  stockQty: int("stockQty").default(100).notNull(),
  lowStockThreshold: int("lowStockThreshold").default(10).notNull(),
  sku: varchar("sku", { length: 64 }),
  weight: decimal("weight", { precision: 6, scale: 2 }),
  tags: text("tags"),
  metaTitle: varchar("metaTitle", { length: 256 }),
  metaDescription: text("metaDescription"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;

// ─── Product Variants ─────────────────────────────────────────────────────────
export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  nameEn: varchar("nameEn", { length: 64 }).notNull(),
  nameAr: varchar("nameAr", { length: 64 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("comparePrice", { precision: 10, scale: 2 }),
  stockQty: int("stockQty").default(100).notNull(),
  sku: varchar("sku", { length: 64 }),
  isDefault: boolean("isDefault").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;

// ─── Cart ─────────────────────────────────────────────────────────────────────
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  userId: int("userId"),
  productId: int("productId").notNull(),
  variantId: int("variantId"),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  type: mysqlEnum("type", ["percentage", "fixed"]).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("0"),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  userId: int("userId"),
  guestEmail: varchar("guestEmail", { length: 320 }),
  guestPhone: varchar("guestPhone", { length: 32 }),
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", [
    "pending",
    "paid",
    "failed",
    "refunded",
  ]).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "cod"]).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  stripeSessionId: varchar("stripeSessionId", { length: 128 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vatAmount", { precision: 10, scale: 2 }).notNull(),
  shippingAmount: decimal("shippingAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  couponCode: varchar("couponCode", { length: 32 }),
  // Shipping address snapshot
  shippingFullName: varchar("shippingFullName", { length: 128 }),
  shippingPhone: varchar("shippingPhone", { length: 32 }),
  shippingAddressLine1: text("shippingAddressLine1"),
  shippingAddressLine2: text("shippingAddressLine2"),
  shippingCity: varchar("shippingCity", { length: 64 }),
  shippingEmirate: varchar("shippingEmirate", { length: 64 }),
  shippingCountry: varchar("shippingCountry", { length: 64 }).default("UAE"),
  notes: text("notes"),
  trackingNumber: varchar("trackingNumber", { length: 64 }),
  smsSent: boolean("smsSent").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;

// ─── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  variantId: int("variantId"),
  productNameEn: varchar("productNameEn", { length: 256 }).notNull(),
  productNameAr: varchar("productNameAr", { length: 256 }).notNull(),
  variantName: varchar("variantName", { length: 64 }),
  productImage: text("productImage"),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  rating: int("rating").notNull(),
  titleEn: varchar("titleEn", { length: 128 }),
  bodyEn: text("bodyEn"),
  isApproved: boolean("isApproved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Store Settings ───────────────────────────────────────────────────────────
export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Tracking Pixels ──────────────────────────────────────────────────────────
export const trackingPixels = mysqlTable("tracking_pixels", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 64 }).notNull().unique(),
  pixelId: varchar("pixelId", { length: 256 }),
  accessToken: text("accessToken"),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  config: text("config"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Page Views ───────────────────────────────────────────────────────────────
export const pageViews = mysqlTable("page_views", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  userId: int("userId"),
  path: varchar("path", { length: 512 }).notNull(),
  referrer: text("referrer"),
  userAgent: text("userAgent"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Discount Rules ───────────────────────────────────────────────────────────
export const discountRules = mysqlTable("discount_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", [
    "cart_total",
    "bogo",
    "quantity_tier",
    "category_discount",
    "product_discount",
    "user_role",
    "first_order",
    "free_shipping",
  ]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  priority: int("priority").default(0).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  usageLimit: int("usageLimit"),
  usedCount: int("usedCount").default(0).notNull(),
  conditions: text("conditions").notNull(), // JSON string
  actions: text("actions").notNull(),       // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscountRule = typeof discountRules.$inferSelect;
export type InsertDiscountRule = typeof discountRules.$inferInsert;

// ─── Push Notification Subscriptions ─────────────────────────────────────────
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Product Images ───────────────────────────────────────────────────────────
export const productImages = mysqlTable("product_images", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  altText: varchar("altText", { length: 256 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

// ─── Admin OTPs (2FA for admin login) ────────────────────────────────────────
export const adminOtps = mysqlTable("admin_otps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  used: int("used").notNull().default(0),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});
export type AdminOtp = typeof adminOtps.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Warehouses ───────────────────────────────────────────────────────────────
export const warehouses = mysqlTable("warehouses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  location: varchar("location", { length: 256 }),
  address: text("address"),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

// ─── Stock Levels ─────────────────────────────────────────────────────────────
export const stockLevels = mysqlTable("stock_levels", {
  id: int("id").autoincrement().primaryKey(),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variantId"),
  qty: decimal("qty", { precision: 12, scale: 3 }).default("0").notNull(),
  reservedQty: decimal("reservedQty", { precision: 12, scale: 3 }).default("0").notNull(),
  reorderPoint: decimal("reorderPoint", { precision: 12, scale: 3 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StockLevel = typeof stockLevels.$inferSelect;

// ─── Stock Movements ──────────────────────────────────────────────────────────
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "purchase",       // incoming from supplier
    "sale",           // outgoing from e-commerce order
    "pos_sale",       // outgoing from POS
    "adjustment",     // manual correction
    "transfer_in",    // received from another warehouse
    "transfer_out",   // sent to another warehouse
    "production_in",  // finished goods added from production
    "production_out", // raw materials consumed by production
    "return",         // customer return
    "opening",        // opening stock entry
  ]).notNull(),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id),
  productId: int("productId").notNull().references(() => products.id),
  variantId: int("variantId"),
  qty: decimal("qty", { precision: 12, scale: 3 }).notNull(), // positive = in, negative = out
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  refType: varchar("refType", { length: 64 }), // 'order', 'pos_order', 'adjustment', 'production_order', 'transfer'
  refId: int("refId"),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StockMovement = typeof stockMovements.$inferSelect;

// ─── Stock Adjustments ────────────────────────────────────────────────────────
export const stockAdjustments = mysqlTable("stock_adjustments", {
  id: int("id").autoincrement().primaryKey(),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id),
  reason: mysqlEnum("reason", [
    "cycle_count",
    "damage",
    "expiry",
    "theft",
    "found",
    "opening_stock",
    "other",
  ]).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["draft", "confirmed", "cancelled"]).default("draft").notNull(),
  confirmedBy: int("confirmedBy").references(() => users.id),
  confirmedAt: timestamp("confirmedAt"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StockAdjustment = typeof stockAdjustments.$inferSelect;

export const stockAdjustmentItems = mysqlTable("stock_adjustment_items", {
  id: int("id").autoincrement().primaryKey(),
  adjustmentId: int("adjustmentId").notNull().references(() => stockAdjustments.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id),
  variantId: int("variantId"),
  expectedQty: decimal("expectedQty", { precision: 12, scale: 3 }).notNull(),
  actualQty: decimal("actualQty", { precision: 12, scale: 3 }).notNull(),
  diff: decimal("diff", { precision: 12, scale: 3 }).notNull(), // actualQty - expectedQty
  notes: text("notes"),
});
export type StockAdjustmentItem = typeof stockAdjustmentItems.$inferSelect;

// ─── Stock Transfers ──────────────────────────────────────────────────────────
export const stockTransfers = mysqlTable("stock_transfers", {
  id: int("id").autoincrement().primaryKey(),
  fromWarehouseId: int("fromWarehouseId").notNull().references(() => warehouses.id),
  toWarehouseId: int("toWarehouseId").notNull().references(() => warehouses.id),
  status: mysqlEnum("status", ["draft", "in_transit", "received", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  receivedBy: int("receivedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  receivedAt: timestamp("receivedAt"),
});
export type StockTransfer = typeof stockTransfers.$inferSelect;

export const stockTransferItems = mysqlTable("stock_transfer_items", {
  id: int("id").autoincrement().primaryKey(),
  transferId: int("transferId").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id),
  variantId: int("variantId"),
  qty: decimal("qty", { precision: 12, scale: 3 }).notNull(),
  receivedQty: decimal("receivedQty", { precision: 12, scale: 3 }),
});
export type StockTransferItem = typeof stockTransferItems.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// POS (POINT OF SALE) MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POS Payment Methods ──────────────────────────────────────────────────────
export const posPaymentMethods = mysqlTable("pos_payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["cash", "card", "bank_transfer", "store_credit", "other"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});
export type PosPaymentMethod = typeof posPaymentMethods.$inferSelect;

// ─── POS Sessions (Shifts) ────────────────────────────────────────────────────
export const posSessions = mysqlTable("pos_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionNumber: varchar("sessionNumber", { length: 32 }).notNull().unique(),
  cashierId: int("cashierId").notNull().references(() => users.id),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  openingCash: decimal("openingCash", { precision: 10, scale: 2 }).default("0").notNull(),
  closingCash: decimal("closingCash", { precision: 10, scale: 2 }),
  expectedCash: decimal("expectedCash", { precision: 10, scale: 2 }),
  cashVariance: decimal("cashVariance", { precision: 10, scale: 2 }),
  totalSales: decimal("totalSales", { precision: 12, scale: 2 }).default("0").notNull(),
  totalOrders: int("totalOrders").default(0).notNull(),
  notes: text("notes"),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
});
export type PosSession = typeof posSessions.$inferSelect;
export type InsertPosSession = typeof posSessions.$inferInsert;

// ─── POS Orders ───────────────────────────────────────────────────────────────
export const posOrders = mysqlTable("pos_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  sessionId: int("sessionId").notNull().references(() => posSessions.id),
  customerId: int("customerId").references(() => users.id),
  customerName: varchar("customerName", { length: 128 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  vatAmount: decimal("vatAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 64 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).notNull(),
  change: decimal("change", { precision: 10, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["completed", "refunded", "voided"]).default("completed").notNull(),
  notes: text("notes"),
  receiptPrinted: boolean("receiptPrinted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PosOrder = typeof posOrders.$inferSelect;
export type InsertPosOrder = typeof posOrders.$inferInsert;

// ─── POS Order Items ──────────────────────────────────────────────────────────
export const posOrderItems = mysqlTable("pos_order_items", {
  id: int("id").autoincrement().primaryKey(),
  posOrderId: int("posOrderId").notNull().references(() => posOrders.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id),
  variantId: int("variantId"),
  productName: varchar("productName", { length: 256 }).notNull(),
  sku: varchar("sku", { length: 64 }),
  qty: decimal("qty", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
});
export type PosOrderItem = typeof posOrderItems.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  code: varchar("code", { length: 32 }).unique(),
  contactName: varchar("contactName", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  country: varchar("country", { length: 64 }).default("UAE"),
  vatNumber: varchar("vatNumber", { length: 64 }),
  paymentTerms: varchar("paymentTerms", { length: 128 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ─── Raw Materials ────────────────────────────────────────────────────────────
export const rawMaterials = mysqlTable("raw_materials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nameAr: varchar("nameAr", { length: 128 }),
  code: varchar("code", { length: 64 }).unique(),
  unit: mysqlEnum("unit", ["kg", "g", "L", "mL", "pcs", "box", "bag", "roll"]).notNull(),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }).default("0").notNull(),
  stockQty: decimal("stockQty", { precision: 12, scale: 3 }).default("0").notNull(),
  reorderPoint: decimal("reorderPoint", { precision: 12, scale: 3 }).default("0").notNull(),
  supplierId: int("supplierId").references(() => suppliers.id),
  warehouseId: int("warehouseId").references(() => warehouses.id),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RawMaterial = typeof rawMaterials.$inferSelect;
export type InsertRawMaterial = typeof rawMaterials.$inferInsert;

// ─── Recipes (Bill of Materials) ──────────────────────────────────────────────
export const recipes = mysqlTable("recipes", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  name: varchar("name", { length: 128 }).notNull(),
  yieldQty: decimal("yieldQty", { precision: 10, scale: 3 }).notNull(), // how many units produced
  yieldUnit: varchar("yieldUnit", { length: 32 }).default("pcs").notNull(),
  overheadCost: decimal("overheadCost", { precision: 10, scale: 2 }).default("0").notNull(), // per batch
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;

export const recipeIngredients = mysqlTable("recipe_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  recipeId: int("recipeId").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  rawMaterialId: int("rawMaterialId").notNull().references(() => rawMaterials.id),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull(),
  unit: mysqlEnum("unit", ["kg", "g", "L", "mL", "pcs", "box", "bag", "roll"]).notNull(),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0).notNull(),
});
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

// ─── Production Orders ────────────────────────────────────────────────────────
export const productionOrders = mysqlTable("production_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  recipeId: int("recipeId").notNull().references(() => recipes.id),
  productId: int("productId").notNull().references(() => products.id),
  warehouseId: int("warehouseId").references(() => warehouses.id),
  plannedQty: decimal("plannedQty", { precision: 10, scale: 3 }).notNull(),
  actualQty: decimal("actualQty", { precision: 10, scale: 3 }),
  batchNumber: varchar("batchNumber", { length: 64 }),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "cancelled"]).default("draft").notNull(),
  scheduledDate: timestamp("scheduledDate"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  totalMaterialCost: decimal("totalMaterialCost", { precision: 12, scale: 2 }),
  totalOverheadCost: decimal("totalOverheadCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

export const productionOrderIngredients = mysqlTable("production_order_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  productionOrderId: int("productionOrderId").notNull().references(() => productionOrders.id, { onDelete: "cascade" }),
  rawMaterialId: int("rawMaterialId").notNull().references(() => rawMaterials.id),
  plannedQty: decimal("plannedQty", { precision: 10, scale: 4 }).notNull(),
  actualQty: decimal("actualQty", { precision: 10, scale: 4 }),
  unit: mysqlEnum("unit", ["kg", "g", "L", "mL", "pcs", "box", "bag", "roll"]).notNull(),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
});
export type ProductionOrderIngredient = typeof productionOrderIngredients.$inferSelect;

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  supplierId: int("supplierId").notNull().references(() => suppliers.id),
  warehouseId: int("warehouseId").references(() => warehouses.id),
  status: mysqlEnum("status", ["draft", "sent", "partial", "received", "cancelled"]).default("draft").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  vatAmount: decimal("vatAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  expectedDate: timestamp("expectedDate"),
  receivedAt: timestamp("receivedAt"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  rawMaterialId: int("rawMaterialId").notNull().references(() => rawMaterials.id),
  orderedQty: decimal("orderedQty", { precision: 12, scale: 3 }).notNull(),
  receivedQty: decimal("receivedQty", { precision: 12, scale: 3 }).default("0").notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 4 }).notNull(),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull(),
});
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTING MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Fiscal Years ─────────────────────────────────────────────────────────────
export const fiscalYears = mysqlTable("fiscal_years", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isClosed: boolean("isClosed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FiscalYear = typeof fiscalYears.$inferSelect;

// ─── Chart of Accounts ────────────────────────────────────────────────────────
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  nameAr: varchar("nameAr", { length: 128 }),
  type: mysqlEnum("type", ["asset", "liability", "equity", "revenue", "expense", "cogs"]).notNull(),
  subtype: varchar("subtype", { length: 64 }),
  parentId: int("parentId"),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  isSystem: boolean("isSystem").default(false).notNull(), // system accounts cannot be deleted
  balance: decimal("balance", { precision: 14, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── Journal Entries ──────────────────────────────────────────────────────────
export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  entryNumber: varchar("entryNumber", { length: 32 }).notNull().unique(),
  date: timestamp("date").notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  refType: varchar("refType", { length: 64 }), // 'order', 'pos_order', 'production_order', 'purchase_order', 'manual'
  refId: int("refId"),
  status: mysqlEnum("status", ["draft", "posted", "reversed"]).default("draft").notNull(),
  reversedBy: int("reversedBy"),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
});
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

// ─── Journal Lines (Debit/Credit) ─────────────────────────────────────────────
export const journalLines = mysqlTable("journal_lines", {
  id: int("id").autoincrement().primaryKey(),
  journalEntryId: int("journalEntryId").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: int("accountId").notNull().references(() => accounts.id),
  debit: decimal("debit", { precision: 14, scale: 2 }).default("0").notNull(),
  credit: decimal("credit", { precision: 14, scale: 2 }).default("0").notNull(),
  description: varchar("description", { length: 256 }),
});
export type JournalLine = typeof journalLines.$inferSelect;

// ─── Tax Rates ────────────────────────────────────────────────────────────────
export const taxRates = mysqlTable("tax_rates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  rate: decimal("rate", { precision: 6, scale: 4 }).notNull(), // e.g. 0.0500 = 5%
  type: mysqlEnum("type", ["vat", "withholding", "other"]).default("vat").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TaxRate = typeof taxRates.$inferSelect;

// ─── POS Held Orders ──────────────────────────────────────────────────────────
export const posHeldOrders = mysqlTable("pos_held_orders", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => posSessions.id),
  label: varchar("label", { length: 128 }),
  customerName: varchar("customerName", { length: 128 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  items: text("items").notNull(), // JSON array of cart items
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PosHeldOrder = typeof posHeldOrders.$inferSelect;

// ─── POS Settings ─────────────────────────────────────────────────────────────
export const posSettings = mysqlTable("pos_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PosSettingsRow = typeof posSettings.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// E-COMMERCE ENHANCEMENT TABLES (All Tiers)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const wishlists = mysqlTable("wishlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Wishlist = typeof wishlists.$inferSelect;

// ─── Flash Sales ─────────────────────────────────────────────────────────────
export const flashSales = mysqlTable("flash_sales", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nameAr: varchar("nameAr", { length: 128 }),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  bannerText: varchar("bannerText", { length: 256 }),
  bannerTextAr: varchar("bannerTextAr", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FlashSale = typeof flashSales.$inferSelect;

export const flashSaleProducts = mysqlTable("flash_sale_products", {
  id: int("id").autoincrement().primaryKey(),
  flashSaleId: int("flashSaleId").notNull().references(() => flashSales.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  overrideDiscount: decimal("overrideDiscount", { precision: 10, scale: 2 }),
});
export type FlashSaleProduct = typeof flashSaleProducts.$inferSelect;

// ─── Product Bundles ──────────────────────────────────────────────────────────
export const productBundles = mysqlTable("product_bundles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nameAr: varchar("nameAr", { length: 128 }),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  imageUrl: varchar("imageUrl", { length: 512 }),
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }).notNull(),
  bundlePrice: decimal("bundlePrice", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  stockLimit: int("stockLimit"),
  soldCount: int("soldCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductBundle = typeof productBundles.$inferSelect;

export const productBundleItems = mysqlTable("product_bundle_items", {
  id: int("id").autoincrement().primaryKey(),
  bundleId: int("bundleId").notNull().references(() => productBundles.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: int("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  quantity: int("quantity").default(1).notNull(),
});
export type ProductBundleItem = typeof productBundleItems.$inferSelect;

// ─── Product Q&A ──────────────────────────────────────────────────────────────
export const productQuestions = mysqlTable("product_questions", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  guestName: varchar("guestName", { length: 128 }),
  guestEmail: varchar("guestEmail", { length: 256 }),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredBy: int("answeredBy").references(() => users.id, { onDelete: "set null" }),
  answeredAt: timestamp("answeredAt"),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductQuestion = typeof productQuestions.$inferSelect;

// ─── Loyalty Points ───────────────────────────────────────────────────────────
export const loyaltyPoints = mysqlTable("loyalty_points", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: int("points").notNull(),
  type: mysqlEnum("type", ["earned_order", "earned_review", "earned_referral", "redeemed", "expired", "manual_adjust"]).notNull(),
  refType: varchar("refType", { length: 64 }),
  refId: int("refId"),
  description: varchar("description", { length: 256 }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LoyaltyPoint = typeof loyaltyPoints.$inferSelect;

export const loyaltySettings = mysqlTable("loyalty_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Abandoned Cart Tracking ──────────────────────────────────────────────────
export const abandonedCarts = mysqlTable("abandoned_carts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  guestEmail: varchar("guestEmail", { length: 256 }),
  cartSnapshot: text("cartSnapshot").notNull(),
  totalValue: decimal("totalValue", { precision: 10, scale: 2 }).notNull(),
  reminderSentAt: timestamp("reminderSentAt"),
  recoveredAt: timestamp("recoveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AbandonedCart = typeof abandonedCarts.$inferSelect;

// ─── Order Tracking Events ────────────────────────────────────────────────────
export const orderTrackingEvents = mysqlTable("order_tracking_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 64 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  titleAr: varchar("titleAr", { length: 256 }),
  description: text("description"),
  location: varchar("location", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
});
export type OrderTrackingEvent = typeof orderTrackingEvents.$inferSelect;

// ─── Recently Viewed Products ─────────────────────────────────────────────────
export const recentlyViewed = mysqlTable("recently_viewed", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});
export type RecentlyViewed = typeof recentlyViewed.$inferSelect;

// ─── Product Review Votes ─────────────────────────────────────────────────────
export const reviewVotes = mysqlTable("review_votes", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  vote: mysqlEnum("vote", ["helpful", "not_helpful"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReviewVote = typeof reviewVotes.$inferSelect;

// ─── Feature Flags (Store Feature Settings) ───────────────────────────────────
export const featureFlags = mysqlTable("feature_flags", {
  id: int("id").autoincrement().primaryKey(),
  feature: varchar("feature", { length: 64 }).notNull().unique(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  config: text("config"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  updatedBy: int("updatedBy").references(() => users.id, { onDelete: "set null" }),
});
export type FeatureFlag = typeof featureFlags.$inferSelect;

// ─── Referral Codes ───────────────────────────────────────────────────────────
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 32 }).notNull().unique(),
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReferralCode = typeof referralCodes.$inferSelect;

export const referralUses = mysqlTable("referral_uses", {
  id: int("id").autoincrement().primaryKey(),
  referralCodeId: int("referralCodeId").notNull().references(() => referralCodes.id),
  referredUserId: int("referredUserId").notNull().references(() => users.id),
  orderId: int("orderId").references(() => orders.id),
  pointsAwarded: int("pointsAwarded").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReferralUse = typeof referralUses.$inferSelect;

// ─── POS Split Payments ───────────────────────────────────────────────────────
export const posSplitPayments = mysqlTable("pos_split_payments", {
  id: int("id").autoincrement().primaryKey(),
  posOrderId: int("posOrderId").notNull().references(() => posOrders.id, { onDelete: "cascade" }),
  paymentMethod: varchar("paymentMethod", { length: 64 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PosSplitPayment = typeof posSplitPayments.$inferSelect;

// ─── POS Product Favorites ────────────────────────────────────────────────────
export const posFavorites = mysqlTable("pos_favorites", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PosFavorite = typeof posFavorites.$inferSelect;

// ─── Inventory Batches (Lot/Batch Tracking) ───────────────────────────────────
export const inventoryBatches = mysqlTable("inventory_batches", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  warehouseId: int("warehouseId").notNull().references(() => warehouses.id, { onDelete: "cascade" }),
  batchNumber: varchar("batchNumber", { length: 64 }).notNull(),
  lotNumber: varchar("lotNumber", { length: 64 }),
  expiryDate: date("expiryDate"),
  manufactureDate: date("manufactureDate"),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).default("0").notNull(),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type InsertInventoryBatch = typeof inventoryBatches.$inferInsert;
