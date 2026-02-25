import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
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
} from "./db";
import { storagePut } from "./storage";

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
      .input(z.object({ phone: z.string(), code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const valid = await verifyOtp(input.phone, input.code);
        if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });

        let user = await getUserByPhone(input.phone);
        if (!user) {
          const openId = `phone_${input.phone.replace(/\D/g, "")}`;
          await upsertUser({ openId, phone: input.phone, loginMethod: "otp" });
          user = await getUserByPhone(input.phone);
        }
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const token = jwt.sign({ userId: user.id, openId: user.openId, role: user.role }, ENV.cookieSecret, { expiresIn: "30d" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
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
          const buffer = Buffer.from(input.base64, 'base64');
          const key = `products/${nanoid()}-${input.filename}`;
          const { url } = await storagePut(key, buffer, input.mimeType);
          return { url };
        }),
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

  // ─── Page Views ───────────────────────────────────────────────────────────
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
