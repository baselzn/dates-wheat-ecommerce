import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _faRaw: any = _require("firebase-admin");
// firebase-admin exports differently depending on ESM/CJS context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firebaseAdmin: any = (_faRaw.default && typeof _faRaw.default.initializeApp === "function") ? _faRaw.default : _faRaw;
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createOrder,
  createOrderItems,
  createReview,
  createOtpSession,
  deleteAddress,
  deleteCategory,
  deleteCoupon,
  deleteProduct,
  getAllCoupons,
  getAllOrders,
  getAllSettings,
  getAllUsers,
  getCategories,
  getCategoryBySlug,
  getCouponByCode,
  getDailyRevenue,
  getDashboardStats,
  getOrderAnalytics,
  getOrderById,
  getOrderByNumber,
  getOrderItems,
  getPageViewStats,
  getProductById,
  getProductBySlug,
  getProductReviews,
  getProducts,
  getProductVariants,
  getTopProducts,
  getTrackingPixels,
  getUserAddresses,
  getUserByEmail,
  getUserById,
  getUserByOpenId,
  getUserByPhone,
  getUserOrders,
  getUsersWithOrderStats,
  incrementCouponUsage,
  logPageView,
  setSetting,
  updateOrderStatus,
  updateOrderStripe,
  upsertAddress,
  upsertCategory,
  upsertCoupon,
  upsertProduct,
  upsertProductVariant,
  upsertTrackingPixel,
  upsertUser,
  verifyOtp,
  applyDiscountRules,
  deleteDiscountRule,
  getDiscountRuleById,
  getDiscountRules,
  upsertDiscountRule,
  savePushSubscription,
  deletePushSubscription,
  getAllPushSubscriptions,
  getPushSubscriptionCount,
  getProductImages,
  addProductImage,
  deleteProductImage,
  setFeaturedProductImage,
  reorderProductImages,
} from "./db";
import { storagePut } from "./storage";

// WooCommerce product type
interface WooProduct {
  id: number;
  name: string;
  slug: string;
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  in_stock: boolean;
  images: Array<{ id: number; src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  attributes: Array<{ id: number; name: string; options: string[] }>;
  variations: number[];
  weight: string;
  dimensions: { length: string; width: string; height: string };
}

// ─── Firebase Admin Init ─────────────────────────────────────────────────────
if (!firebaseAdmin.apps || firebaseAdmin.apps.length === 0) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

// ─── Admin guard ─────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DW-${ts}-${rand}`;
}

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Customer OTP login
    sendOtp: publicProcedure
      .input(z.object({ phone: z.string().min(9) }))
      .mutation(async ({ input }) => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await createOtpSession(input.phone, code);
        // In production: send via Twilio. For now log to console.
        console.log(`[OTP] Phone: ${input.phone} Code: ${code}`);
        return { success: true, code: process.env.NODE_ENV === "development" ? code : undefined };
      }),

     verifyOtp: publicProcedure
      .input(z.object({ phone: z.string(), code: z.string(), name: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const valid = await verifyOtp(input.phone, input.code);
        if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
        let user = await getUserByPhone(input.phone);
        if (!user) {
          // New user — create account with name
          const openId = `phone_${input.phone.replace(/\D/g, "")}`;
          await upsertUser({ openId, phone: input.phone, name: input.name ?? null, loginMethod: "otp" });
          user = await getUserByPhone(input.phone);
        } else if (input.name && !user.name) {
          // Existing user without a name — update it
          await upsertUser({ openId: user.openId, name: input.name });
          user = await getUserByPhone(input.phone);
        }
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const token = jwt.sign({ userId: user.id, openId: user.openId, role: user.role }, ENV.cookieSecret, { expiresIn: "30d" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

    // Firebase Phone Auth — verifies Firebase ID token and issues app JWT session
    firebaseLogin: publicProcedure
      .input(z.object({
        idToken: z.string(),
        phone: z.string(),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify the Firebase ID token server-side
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let decodedToken: any;
        try {
          decodedToken = await firebaseAdmin.auth().verifyIdToken(input.idToken);
        } catch {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Firebase token. Please try again." });
        }

        const firebaseUid = decodedToken.uid;
        const phoneFromToken = decodedToken.phone_number || input.phone;
        const openId = `firebase_${firebaseUid}`;

        // Upsert user — creates on first login, updates lastSignedIn on return visits
        await upsertUser({
          openId,
          phone: phoneFromToken,
          name: input.name ?? null,
          loginMethod: "firebase_otp",
          lastSignedIn: new Date(),
        });

        // Fetch the user record
        let finalUser = await getUserByPhone(phoneFromToken);
        if (!finalUser) finalUser = await getUserByOpenId(openId);
        if (!finalUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User creation failed" });

        // Issue our app JWT session cookie (30 days)
        const token = jwt.sign(
          { userId: finalUser.id, openId: finalUser.openId, role: finalUser.role },
          ENV.cookieSecret,
          { expiresIn: "30d" }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, user: finalUser };
      }),

    // Admin email/password login
    adminLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || user.role !== "admin") throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        if (!user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "No password set" });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

        const token = jwt.sign({ userId: user.id, openId: user.openId, role: user.role }, ENV.cookieSecret, { expiresIn: "7d" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().optional(), email: z.string().email().optional() }))
      .mutation(async ({ input, ctx }) => {
        await upsertUser({ openId: ctx.user.openId, ...input });
        return { success: true };
      }),
  }),

  // ─── Categories ───────────────────────────────────────────────────────────
  categories: router({
    list: publicProcedure.query(() => getCategories(true)),
    all: adminProcedure.query(() => getCategories(false)),
    bySlug: publicProcedure.input(z.string()).query(({ input }) => getCategoryBySlug(input)),
    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        nameEn: z.string(),
        nameAr: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(({ input }) => upsertCategory(input)),
    delete: adminProcedure.input(z.number()).mutation(({ input }) => deleteCategory(input)),
  }),

  // ─── Products ─────────────────────────────────────────────────────────────
  products: router({
    list: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        categorySlug: z.string().optional(),
        search: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        isGlutenFree: z.boolean().optional(),
        isSugarFree: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
        sortBy: z.enum(["price_asc", "price_desc", "newest", "popular"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        const result = await getProducts(input ?? {});
        return {
          ...result,
          products: result.products.map(p => ({
            ...p,
            images: parseImages(p.images as unknown as string),
            tags: parseTags(p.tags as unknown as string),
          })),
        };
      }),

    bySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
      const product = await getProductBySlug(input);
      if (!product) return null;
      const [variants, reviewList] = await Promise.all([
        getProductVariants(product.id),
        getProductReviews(product.id),
      ]);
      return {
        ...product,
        images: parseImages(product.images as unknown as string),
        tags: parseTags(product.tags as unknown as string),
        variants,
        reviews: reviewList,
      };
    }),

    byId: adminProcedure.input(z.number()).query(async ({ input }) => {
      const product = await getProductById(input);
      if (!product) return null;
      const variants = await getProductVariants(product.id);
      return {
        ...product,
        images: parseImages(product.images as unknown as string),
        tags: parseTags(product.tags as unknown as string),
        variants,
      };
    }),

    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        categoryId: z.number(),
        nameEn: z.string(),
        nameAr: z.string(),
        slug: z.string(),
        descriptionEn: z.string().optional(),
        descriptionAr: z.string().optional(),
        basePrice: z.string(),
        comparePrice: z.string().optional(),
        images: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        isGlutenFree: z.boolean().optional(),
        isSugarFree: z.boolean().optional(),
        isVegan: z.boolean().optional(),
        stockQty: z.number().optional(),
        lowStockThreshold: z.number().optional(),
        sku: z.string().optional(),
        tags: z.array(z.string()).optional(),
        variants: z.array(z.object({
          id: z.number().optional(),
          nameEn: z.string(),
          nameAr: z.string(),
          price: z.string(),
          comparePrice: z.string().optional(),
          stockQty: z.number().optional(),
          sku: z.string().optional(),
          isDefault: z.boolean().optional(),
          sortOrder: z.number().optional(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { variants, images, tags, ...productData } = input;
        const productId = await upsertProduct({
          ...productData,
          images: images ? JSON.stringify(images) : undefined,
          tags: tags ? JSON.stringify(tags) : undefined,
        });
        if (variants) {
          for (const v of variants) {
            await upsertProductVariant({ ...v, productId });
          }
        }
        return { id: productId };
      }),

    delete: adminProcedure.input(z.number()).mutation(({ input }) => deleteProduct(input)),

    uploadImage: adminProcedure
      .input(z.object({ base64: z.string(), filename: z.string(), mimeType: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `products/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),

  // ─── Reviews ──────────────────────────────────────────────────────────────
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        orderId: z.number().optional(),
        rating: z.number().min(1).max(5),
        titleEn: z.string().optional(),
        bodyEn: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => createReview({ ...input, userId: ctx.user.id })),
  }),

  // ─── Coupons ──────────────────────────────────────────────────────────────
  coupons: router({
    validate: publicProcedure
      .input(z.object({ code: z.string(), orderAmount: z.number() }))
      .query(async ({ input }) => {
        const coupon = await getCouponByCode(input.code);
        if (!coupon || !coupon.isActive) return { valid: false, message: "Invalid coupon code" };
        if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, message: "Coupon expired" };
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { valid: false, message: "Coupon usage limit reached" };
        if (Number(coupon.minOrderAmount) > input.orderAmount) return { valid: false, message: `Minimum order AED ${coupon.minOrderAmount}` };
        const discount = coupon.type === "percentage"
          ? (input.orderAmount * Number(coupon.value)) / 100
          : Number(coupon.value);
        return { valid: true, coupon, discount: Math.min(discount, input.orderAmount) };
      }),

    list: adminProcedure.query(() => getAllCoupons()),
    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        code: z.string(),
        type: z.enum(["percentage", "fixed"]),
        value: z.string(),
        minOrderAmount: z.string().optional(),
        maxUses: z.number().optional(),
        isActive: z.boolean().optional(),
        expiresAt: z.date().optional().nullable(),
      }))
      .mutation(({ input }) => upsertCoupon(input)),
  }),

  // ─── Orders ───────────────────────────────────────────────────────────────
  orders: router({
    create: publicProcedure
      .input(z.object({
        paymentMethod: z.enum(["stripe", "cod"]),
        items: z.array(z.object({
          productId: z.number(),
          variantId: z.number().optional(),
          quantity: z.number(),
          unitPrice: z.number(),
          productNameEn: z.string(),
          productNameAr: z.string(),
          variantName: z.string().optional(),
          productImage: z.string().optional(),
        })),
        couponCode: z.string().optional(),
        discountAmount: z.number().optional(),
        shippingFullName: z.string(),
        shippingPhone: z.string(),
        shippingAddressLine1: z.string(),
        shippingAddressLine2: z.string().optional(),
        shippingCity: z.string(),
        shippingEmirate: z.string(),
        guestEmail: z.string().email().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const discountAmount = input.discountAmount ?? 0;
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = afterDiscount * 0.05;
        const shippingAmount = afterDiscount >= 200 ? 0 : 25;
        const total = afterDiscount + vatAmount + shippingAmount;
        const orderNumber = generateOrderNumber();

        const orderId = await createOrder({
          orderNumber,
          userId: ctx.user?.id,
          guestEmail: input.guestEmail,
          guestPhone: input.shippingPhone,
          paymentMethod: input.paymentMethod,
          subtotal: subtotal.toFixed(2),
          vatAmount: vatAmount.toFixed(2),
          shippingAmount: shippingAmount.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          total: total.toFixed(2),
          couponCode: input.couponCode,
          shippingFullName: input.shippingFullName,
          shippingPhone: input.shippingPhone,
          shippingAddressLine1: input.shippingAddressLine1,
          shippingAddressLine2: input.shippingAddressLine2,
          shippingCity: input.shippingCity,
          shippingEmirate: input.shippingEmirate,
          notes: input.notes,
        });

        await createOrderItems(input.items.map(i => ({
          orderId,
          productId: i.productId,
          variantId: i.variantId,
          productNameEn: i.productNameEn,
          productNameAr: i.productNameAr,
          variantName: i.variantName,
          productImage: i.productImage,
          quantity: i.quantity,
          unitPrice: i.unitPrice.toFixed(2),
          totalPrice: (i.unitPrice * i.quantity).toFixed(2),
        })));

        if (input.couponCode) await incrementCouponUsage(input.couponCode);

        return { orderId, orderNumber, total };
      }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const userOrders = await getUserOrders(ctx.user.id);
      return Promise.all(userOrders.map(async o => ({
        ...o,
        items: await getOrderItems(o.id),
      })));
    }),

    byNumber: publicProcedure.input(z.string()).query(async ({ input }) => {
      const order = await getOrderByNumber(input);
      if (!order) return null;
      const items = await getOrderItems(order.id);
      return { ...order, items };
    }),

    // Admin
    list: adminProcedure
      .input(z.object({ page: z.number().optional(), limit: z.number().optional(), status: z.string().optional() }).optional())
      .query(({ input }) => getAllOrders(input?.page, input?.limit, input?.status)),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
        paymentStatus: z.string().optional(),
        trackingNumber: z.string().optional(),
      }))
      .mutation(({ input }) => updateOrderStatus(input.id, input.status, input.paymentStatus, input.trackingNumber)),
  }),

  // ─── Addresses ────────────────────────────────────────────────────────────
  addresses: router({
    list: protectedProcedure.query(({ ctx }) => getUserAddresses(ctx.user.id)),
    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        label: z.string().optional(),
        fullName: z.string(),
        phone: z.string(),
        addressLine1: z.string(),
        addressLine2: z.string().optional(),
        city: z.string(),
        emirate: z.string(),
        isDefault: z.boolean().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        mapAddress: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => upsertAddress({ ...input, userId: ctx.user.id })),
    delete: protectedProcedure.input(z.number()).mutation(({ input, ctx }) => deleteAddress(input, ctx.user.id)),
  }),

  // ─── Analytics ────────────────────────────────────────────────────────────
  analytics: router({
    summary: adminProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(({ input }) => getOrderAnalytics(input?.days ?? 30)),
    dailyRevenue: adminProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(({ input }) => getDailyRevenue(input?.days ?? 30)),
    topProducts: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => getTopProducts(input?.limit ?? 5)),
    pageViews: adminProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(({ input }) => getPageViewStats(input?.days ?? 30)),
    users: adminProcedure
      .input(z.object({ page: z.number().optional() }).optional())
      .query(({ input }) => getAllUsers(input?.page ?? 1)),
  }),

  // ─── Settings ─────────────────────────────────────────────────────────────
  settings: router({
    all: adminProcedure.query(() => getAllSettings()),
    set: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(({ input }) => setSetting(input.key, input.value)),
    setMany: adminProcedure
      .input(z.array(z.object({ key: z.string(), value: z.string() })))
      .mutation(async ({ input }) => {
        for (const s of input) await setSetting(s.key, s.value);
        return { success: true };
      }),
  }),

  // ─── Tracking Pixels ──────────────────────────────────────────────────────
  tracking: router({
    list: adminProcedure.query(() => getTrackingPixels()),
    // Public: returns all pixels (enabled + disabled) with accessToken masked for client use
    getAll: publicProcedure.query(async () => {
      const pixels = await getTrackingPixels();
      return pixels.map(p => ({
        platform: p.platform,
        pixelId: p.pixelId,
        accessToken: p.accessToken ? '***' : null, // mask token for client
        isEnabled: p.isEnabled,
      }));
    }),
    upsert: adminProcedure
      .input(z.object({
        platform: z.string(),
        pixelId: z.string().optional(),
        accessToken: z.string().optional(),
        isEnabled: z.boolean().optional(),
        config: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(({ input }) => upsertTrackingPixel({
        ...input,
        config: input.config ? JSON.stringify(input.config) : undefined,
      })),
    publicPixels: publicProcedure.query(async () => {
      const pixels = await getTrackingPixels();
      return pixels.filter(p => p.isEnabled).map(p => ({
        platform: p.platform,
        pixelId: p.pixelId,
        config: p.config ? (() => { try { return JSON.parse(p.config!); } catch { return {}; } })() : {},
      }));
    }),
    // Server-side CAPI: Meta Conversions API
    mirrorMeta: publicProcedure
      .input(z.object({
        pixelId: z.string(),
        accessToken: z.string(),
        eventName: z.string(),
        eventData: z.record(z.string(), z.unknown()),
        sourceUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const eventTime = Math.floor(Date.now() / 1000);
          const payload = {
            data: [{
              event_name: input.eventName,
              event_time: eventTime,
              action_source: 'website',
              event_source_url: input.sourceUrl || '',
              user_data: { client_user_agent: 'Mozilla/5.0' },
              custom_data: {
                currency: 'AED',
                ...input.eventData,
              },
            }],
            test_event_code: undefined,
          };
          const res = await fetch(
            `https://graph.facebook.com/v19.0/${input.pixelId}/events?access_token=${input.accessToken}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
          );
          const json = await res.json() as { events_received?: number; error?: unknown };
          return { success: true, eventsReceived: json.events_received };
        } catch (e) {
          console.error('[Meta CAPI] Error:', e);
          return { success: false };
        }
      }),
    // Server-side Events API: TikTok
    mirrorTikTok: publicProcedure
      .input(z.object({
        pixelId: z.string(),
        accessToken: z.string(),
        eventName: z.string(),
        eventData: z.record(z.string(), z.unknown()),
        sourceUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const ttEventMap: Record<string, string> = {
            PageView: 'Pageview',
            ViewContent: 'ViewContent',
            AddToCart: 'AddToCart',
            InitiateCheckout: 'InitiateCheckout',
            Purchase: 'CompletePayment',
            Search: 'Search',
            CompleteRegistration: 'CompleteRegistration',
          };
          const ttEvent = ttEventMap[input.eventName] || input.eventName;
          const payload = {
            pixel_code: input.pixelId,
            event: ttEvent,
            timestamp: new Date().toISOString(),
            context: {
              page: { url: input.sourceUrl || '' },
              user_agent: 'Mozilla/5.0',
            },
            properties: {
              currency: 'AED',
              ...input.eventData,
            },
          };
          const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
            method: 'POST',
            headers: { 'Access-Token': input.accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json() as { code?: number; message?: string };
          return { success: json.code === 0, message: json.message };
        } catch (e) {
          console.error('[TikTok Events API] Error:', e);
          return { success: false };
        }
      }),
    // Admin: test a pixel event
    testEvent: adminProcedure
      .input(z.object({ platform: z.string() }))
      .mutation(async ({ input }) => {
        const pixels = await getTrackingPixels();
        const pixel = pixels.find(p => p.platform === input.platform);
        if (!pixel?.isEnabled || !pixel.pixelId) {
          return { success: false, message: 'Pixel not configured or disabled' };
        }
        return { success: true, message: `Test event queued for ${input.platform} (pixel: ${pixel.pixelId})` };
      }),
  }),

  // ─── Admin Sub-Router ──────────────────────────────────────────────────────
  admin: router({
    dashboardStats: adminProcedure.query(() => getDashboardStats()),
    salesChart: adminProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const days = input?.days ?? 30;
        const [daily, topProductsRaw] = await Promise.all([
          getDailyRevenue(days),
          getTopProducts(8),
        ]);
        return {
          daily: daily.map(d => ({ date: String(d.date).slice(5), revenue: Number(d.revenue), orders: Number(d.orders) })),
          topProducts: topProductsRaw.map(p => ({ name: p.productNameEn.substring(0, 20), revenue: Number(p.totalRevenue) })),
        };
      }),

    products: router({
      list: adminProcedure
        .input(z.object({ search: z.string().optional(), page: z.number().optional(), limit: z.number().optional() }).optional())
        .query(async ({ input }) => {
          const result = await getProducts({ search: input?.search, page: input?.page ?? 1, limit: input?.limit ?? 20, isActive: undefined });
          return {
            ...result,
            products: result.products.map(p => ({
              ...p,
              images: (() => { try { return JSON.parse(p.images as unknown as string || '[]'); } catch { return []; } })(),
              categoryName: undefined,
            })),
          };
        }),
      upsert: adminProcedure
        .input(z.object({
          id: z.number().optional(),
          categoryId: z.number().optional(),
            nameEn: z.string(),
          nameAr: z.string().optional(),
          slug: z.string(),
          descriptionEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          basePrice: z.number(),
          comparePrice: z.number().optional(),
          images: z.array(z.string()).optional(),
          isActive: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          isGlutenFree: z.boolean().optional(),
          isSugarFree: z.boolean().optional(),
          isVegan: z.boolean().optional(),
          stockQty: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { images, ...rest } = input;
          const productId = await upsertProduct({
            ...rest,
            nameAr: rest.nameAr ?? '',
            categoryId: rest.categoryId ?? 1,
            basePrice: String(rest.basePrice),
            comparePrice: rest.comparePrice ? String(rest.comparePrice) : undefined,
            images: images ? JSON.stringify(images) : undefined,
          });
          return { id: productId };
        }),
    delete: adminProcedure.input(z.number()).mutation(({ input }) => deleteProduct(input)),
    uploadImage: adminProcedure
      .input(z.object({ base64: z.string(), filename: z.string(), mimeType: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `products/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
    // ── Multi-image gallery procedures ──
    getImages: publicProcedure.input(z.number()).query(({ input }) => getProductImages(input)),
    addImage: adminProcedure
      .input(z.object({
        productId: z.number(),
        base64: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        altText: z.string().optional(),
        isFeatured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `products/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const id = await addProductImage({
          productId: input.productId,
          url,
          fileKey: key,
          altText: input.altText,
          isFeatured: input.isFeatured,
        });
        return { id, url };
      }),
    deleteImage: adminProcedure.input(z.number()).mutation(({ input }) => deleteProductImage(input)),
    setFeaturedImage: adminProcedure
      .input(z.object({ productId: z.number(), imageId: z.number() }))
      .mutation(({ input }) => setFeaturedProductImage(input.productId, input.imageId)),
    reorderImages: adminProcedure
      .input(z.object({ productId: z.number(), orderedIds: z.array(z.number()) }))
      .mutation(({ input }) => reorderProductImages(input.productId, input.orderedIds)),
  }),

    orders: router({
      list: adminProcedure
        .input(z.object({ search: z.string().optional(), status: z.string().optional(), page: z.number().optional(), limit: z.number().optional() }).optional())
        .query(({ input }) => getAllOrders(input?.page ?? 1, input?.limit ?? 20, input?.status)),
      detail: adminProcedure.input(z.number()).query(async ({ input }) => {
        const order = await getOrderById(input);
        if (!order) return null;
        const items = await getOrderItems(input);
        return { ...order, items };
      }),
      updateStatus: adminProcedure
        .input(z.object({ id: z.number(), status: z.string(), trackingNumber: z.string().optional() }))
        .mutation(({ input }) => updateOrderStatus(input.id, input.status, undefined, input.trackingNumber)),
    }),

    customers: router({
      list: adminProcedure
        .input(z.object({ search: z.string().optional(), page: z.number().optional(), limit: z.number().optional() }).optional())
        .query(({ input }) => getUsersWithOrderStats(input?.page ?? 1, input?.limit ?? 20, input?.search)),
    }),

    categories: router({
      upsert: adminProcedure
        .input(z.object({
          id: z.number().optional(),
          nameEn: z.string(),
          nameAr: z.string().optional(),
          slug: z.string(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(({ input }) => upsertCategory({ ...input, nameAr: input.nameAr ?? '' })),
      delete: adminProcedure.input(z.number()).mutation(({ input }) => deleteCategory(input)),
    }),

    coupons: router({
      list: adminProcedure.query(() => getAllCoupons()),
      upsert: adminProcedure
        .input(z.object({
          id: z.number().optional(),
          code: z.string(),
          type: z.enum(['percentage', 'fixed']),
          value: z.number(),
          minOrderAmount: z.number().optional(),
          maxUses: z.number().optional(),
          isActive: z.boolean().optional(),
          expiresAt: z.date().optional().nullable(),
        }))
        .mutation(({ input }) => upsertCoupon({
          ...input,
          value: String(input.value),
          minOrderAmount: input.minOrderAmount ? String(input.minOrderAmount) : undefined,
        })),
      delete: adminProcedure.input(z.number()).mutation(({ input }) => deleteCoupon(input)),
    }),

    settings: router({
      get: adminProcedure.query(async () => {
        const allSettings = await getAllSettings();
        const map: Record<string, string> = {};
        for (const s of allSettings) map[s.key] = s.value ?? '';
        return {
          storeName: map['store_name'] ?? 'Dates & Wheat',
          storeEmail: map['store_email'] ?? 'admin@datesandwheat.com',
          storePhone: map['store_phone'] ?? '+971 92237070',
          storeAddress: map['store_address'] ?? 'Fujairah, UAE',
          freeShippingThreshold: Number(map['free_shipping_threshold'] ?? 200),
          shippingFee: Number(map['shipping_fee'] ?? 25),
          vatRate: Number(map['vat_rate'] ?? 5),
          metaTitle: map['meta_title'] ?? 'Dates & Wheat | Premium Arabic Sweets',
          metaDescription: map['meta_description'] ?? '',
        };
      }),
      update: adminProcedure
        .input(z.object({
          storeName: z.string().optional(),
          storeEmail: z.string().optional(),
          storePhone: z.string().optional(),
          storeAddress: z.string().optional(),
          freeShippingThreshold: z.number().optional(),
          shippingFee: z.number().optional(),
          vatRate: z.number().optional(),
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const pairs: [string, string][] = [
            ['store_name', input.storeName ?? ''],
            ['store_email', input.storeEmail ?? ''],
            ['store_phone', input.storePhone ?? ''],
            ['store_address', input.storeAddress ?? ''],
            ['free_shipping_threshold', String(input.freeShippingThreshold ?? 200)],
            ['shipping_fee', String(input.shippingFee ?? 25)],
            ['vat_rate', String(input.vatRate ?? 5)],
            ['meta_title', input.metaTitle ?? ''],
            ['meta_description', input.metaDescription ?? ''],
          ];
          for (const [k, v] of pairs) if (v !== '') await setSetting(k, v);
          return { success: true };
        }),
    }),
  }),

  // ─── Discount Rules ─────────────────────────────────────────────────────
  discountRules: router({
    list: adminProcedure.query(() => getDiscountRules(false)),
    listActive: publicProcedure.query(() => getDiscountRules(true)),
    byId: adminProcedure.input(z.number()).query(({ input }) => getDiscountRuleById(input)),
    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(["cart_total", "bogo", "quantity_tier", "category_discount", "product_discount", "user_role", "first_order", "free_shipping"]),
        isActive: z.boolean(),
        priority: z.number(),
        startsAt: z.date().optional().nullable(),
        endsAt: z.date().optional().nullable(),
        usageLimit: z.number().optional().nullable(),
        conditions: z.string(),
        actions: z.string(),
      }))
      .mutation(({ input }) => upsertDiscountRule(input)),
    delete: adminProcedure.input(z.number()).mutation(({ input }) => deleteDiscountRule(input)),
    calculate: publicProcedure
      .input(z.object({
        cartItems: z.array(z.object({
          productId: z.number(),
          categoryId: z.number(),
          quantity: z.number(),
          unitPrice: z.number(),
        })),
        subtotal: z.number(),
        isFirstOrder: z.boolean().optional(),
      }))
      .mutation(({ input }) => applyDiscountRules(input)),
  }),

  // ─── WooCommerce Importer ────────────────────────────────────────────────
  woocommerce: router({
    testConnection: adminProcedure
      .input(z.object({
        storeUrl: z.string().url(),
        consumerKey: z.string(),
        consumerSecret: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storeUrl, consumerKey, consumerSecret } = input;
        const base = storeUrl.replace(/\/$/, "");
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const res = await fetch(`${base}/wp-json/wc/v3/system_status`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `WooCommerce connection failed: ${res.status} ${res.statusText}` });
        const data = await res.json() as { environment?: { wp_version?: string; wc_version?: string } };
        return { success: true, wpVersion: data.environment?.wp_version, wcVersion: data.environment?.wc_version };
      }),

    fetchProducts: adminProcedure
      .input(z.object({
        storeUrl: z.string().url(),
        consumerKey: z.string(),
        consumerSecret: z.string(),
        page: z.number().default(1),
        perPage: z.number().default(20),
      }))
      .mutation(async ({ input }) => {
        const { storeUrl, consumerKey, consumerSecret, page, perPage } = input;
        const base = storeUrl.replace(/\/$/, "");
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const url = `${base}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`;
        const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
        if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `Failed to fetch products: ${res.status}` });
        const wooProducts = await res.json() as WooProduct[];
        const totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
        const totalProducts = Number(res.headers.get("X-WP-Total") || 0);
        return { products: wooProducts, totalPages, totalProducts, currentPage: page };
      }),

    importProducts: adminProcedure
      .input(z.object({
        storeUrl: z.string().url(),
        consumerKey: z.string(),
        consumerSecret: z.string(),
        productIds: z.array(z.number()),
        defaultCategoryId: z.number(),
        importImages: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const { storeUrl, consumerKey, consumerSecret, productIds, defaultCategoryId, importImages } = input;
        const base = storeUrl.replace(/\/$/, "");
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const results: { id: number; name: string; status: "imported" | "updated" | "failed"; error?: string }[] = [];

        for (const wooId of productIds) {
          try {
            const res = await fetch(`${base}/wp-json/wc/v3/products/${wooId}`, {
              headers: { Authorization: `Basic ${auth}` },
            });
            if (!res.ok) { results.push({ id: wooId, name: "", status: "failed", error: `HTTP ${res.status}` }); continue; }
            const p = await res.json() as WooProduct;

            // Map WooCommerce category to local category
            let categoryId = defaultCategoryId;
            if (p.categories?.length) {
              const wooSlug = p.categories[0].slug;
              const dbCats = await getCategories(false);
              const match = dbCats.find(c => c.slug === wooSlug || c.nameEn.toLowerCase() === p.categories[0].name.toLowerCase());
              if (match) categoryId = match.id;
            }

            // Collect images
            const images: string[] = [];
            if (importImages && p.images?.length) {
              images.push(...p.images.slice(0, 5).map(img => img.src));
            }

            const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const basePrice = p.sale_price || p.regular_price || p.price || "0";
            const comparePrice = p.sale_price && p.regular_price ? p.regular_price : undefined;

            const productId = await upsertProduct({
              categoryId,
              nameEn: p.name,
              nameAr: p.name,
              slug,
              descriptionEn: p.short_description?.replace(/<[^>]+>/g, "") || p.description?.replace(/<[^>]+>/g, ""),
              basePrice,
              comparePrice,
              images: images.length ? JSON.stringify(images) : undefined,
              isActive: p.status === "publish",
              stockQty: p.stock_quantity ?? (p.in_stock ? 100 : 0),
              sku: p.sku || undefined,
              tags: p.tags?.map(t => t.name).join(",") || undefined,
            });

            results.push({ id: wooId, name: p.name, status: "imported" });
          } catch (err) {
            results.push({ id: wooId, name: "", status: "failed", error: String(err) });
          }
        }
        return { results, imported: results.filter(r => r.status === "imported").length, failed: results.filter(r => r.status === "failed").length };
      }),

    fetchCategories: adminProcedure
      .input(z.object({
        storeUrl: z.string().url(),
        consumerKey: z.string(),
        consumerSecret: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storeUrl, consumerKey, consumerSecret } = input;
        const base = storeUrl.replace(/\/$/, "");
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const res = await fetch(`${base}/wp-json/wc/v3/products/categories?per_page=100`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `Failed to fetch categories: ${res.status}` });
        const cats = await res.json() as Array<{ id: number; name: string; slug: string; image?: { src: string } | null; count: number }>;
        return cats.filter(c => c.slug !== "uncategorized");
      }),

    importCategories: adminProcedure
      .input(z.object({
        storeUrl: z.string().url(),
        consumerKey: z.string(),
        consumerSecret: z.string(),
        categoryIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const { storeUrl, consumerKey, consumerSecret, categoryIds } = input;
        const base = storeUrl.replace(/\/$/, "");
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        const results: { id: number; name: string; status: string }[] = [];
        for (const wooId of categoryIds) {
          try {
            const res = await fetch(`${base}/wp-json/wc/v3/products/categories/${wooId}`, {
              headers: { Authorization: `Basic ${auth}` },
            });
            if (!res.ok) { results.push({ id: wooId, name: "", status: "failed" }); continue; }
            const c = await res.json() as { id: number; name: string; slug: string; image?: { src: string } | null; description?: string };
            await upsertCategory({
              nameEn: c.name,
              nameAr: c.name,
              slug: c.slug,
              description: c.description?.replace(/<[^>]+>/g, ""),
              imageUrl: c.image?.src || undefined,
              isActive: true,
            });
            results.push({ id: wooId, name: c.name, status: "imported" });
          } catch (err) {
            results.push({ id: wooId, name: "", status: "failed" });
          }
        }
        return { results, imported: results.filter(r => r.status === "imported").length };
      }),
  }),

  // ─── P  // ─── Push Notifications ──────────────────────────────────────
  push: router({
    subscribe: publicProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await savePushSubscription({
          ...input,
          userId: ctx.user?.id ?? null,
          userAgent: ctx.req.headers["user-agent"] ?? "",
        });
        return { success: true };
      }),

    unsubscribe: publicProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await deletePushSubscription(input.endpoint);
        return { success: true };
      }),

    count: adminProcedure.query(() => getPushSubscriptionCount()),

    send: adminProcedure
      .input(z.object({
        title: z.string(),
        body: z.string(),
        url: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // web-push is a CJS module; when dynamically imported in an ESM context
        // the real API lives on .default — fall back to the module itself for safety.
        const webpushMod = await import("web-push");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const webpush: any = (webpushMod as any).default ?? webpushMod;
        webpush.setVapidDetails(
          "mailto:info@datesandwheat.com",
          process.env.VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!
        );
        const subs = await getAllPushSubscriptions();
        const payload = JSON.stringify({
          title: input.title,
          body: input.body,
          url: input.url ?? "/",
          icon: input.icon ?? "https://files.manuscdn.com/user_upload_by_module/session_file/109084477/lQfRZsUBmPvUTuLR.webp",
        });
        let sent = 0;
        let failed = 0;
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sent++;
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await deletePushSubscription(sub.endpoint);
            }
            failed++;
          }
        }
        return { sent, failed, total: subs.length };
      }),
  }),

  // ─── Page Views ─────────────────────────────────────────────
  pageViews: router({
    log: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        path: z.string(),
        referrer: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => logPageView({
        ...input,
        userId: ctx.user?.id,
        userAgent: ctx.req.headers["user-agent"],
        ip: ctx.req.headers["x-forwarded-for"] as string || "",
      })),
  }),
});

export type AppRouter = typeof appRouter;
