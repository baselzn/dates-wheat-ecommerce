import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  wishlists, flashSales, flashSaleProducts, productBundles, productBundleItems,
  productQuestions, loyaltyPoints, loyaltySettings, abandonedCarts,
  orderTrackingEvents, recentlyViewed, reviewVotes, featureFlags,
  referralCodes, referralUses, products, orders,
} from "../../drizzle/schema";
import { eq, and, desc, sql, inArray, gt, lt, gte, lte, like, or, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Feature Flags Helper ─────────────────────────────────────────────────────
async function isFeatureEnabled(feature: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const rows = await db.select().from(featureFlags).where(eq(featureFlags.feature, feature)).limit(1);
  if (rows.length === 0) return true; // default enabled if not configured
  return rows[0].isEnabled;
}

// ─── Wishlist Router ──────────────────────────────────────────────────────────
const wishlistRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const items = await db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        variantId: wishlists.variantId,
        createdAt: wishlists.createdAt,
        productNameEn: products.nameEn,
        productNameAr: products.nameAr,
        productSlug: products.slug,
        productImages: products.images,
        productBasePrice: products.basePrice,
        productComparePrice: products.comparePrice,
        productStockQty: products.stockQty,
        productIsActive: products.isActive,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, ctx.user.id))
      .orderBy(desc(wishlists.createdAt));
    return items;
  }),

  toggle: protectedProcedure
    .input(z.object({ productId: z.number(), variantId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select()
        .from(wishlists)
        .where(and(eq(wishlists.userId, ctx.user.id), eq(wishlists.productId, input.productId)))
        .limit(1);
      if (existing.length > 0) {
        await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
        return { action: "removed" };
      } else {
        await db.insert(wishlists).values({
          userId: ctx.user.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
        });
        return { action: "added" };
      }
    }),

  check: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(and(eq(wishlists.userId, ctx.user.id), eq(wishlists.productId, input.productId)))
        .limit(1);
      return { isWishlisted: rows.length > 0 };
    }),
});

// ─── Flash Sales Router ───────────────────────────────────────────────────────
const flashSalesRouter = router({
  active: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const now = new Date();
    const activeSales = await db
      .select()
      .from(flashSales)
      .where(and(
        eq(flashSales.isActive, true),
        lte(flashSales.startsAt, now),
        gte(flashSales.endsAt, now),
      ))
      .orderBy(flashSales.endsAt);
    // For each active sale, fetch products with computed sale price
    const result = [];
    for (const sale of activeSales) {
      const saleProds = await db
        .select({
          id: flashSaleProducts.id,
          productId: products.id,
          productNameEn: products.nameEn,
          productNameAr: products.nameAr,
          productBasePrice: products.basePrice,
          productImages: products.images,
          productSlug: products.slug,
          overrideDiscount: flashSaleProducts.overrideDiscount,
          endsAt: flashSales.endsAt,
          saleName: flashSales.name,
          discountType: flashSales.discountType,
          discountValue: flashSales.discountValue,
        })
        .from(flashSaleProducts)
        .innerJoin(products, eq(flashSaleProducts.productId, products.id))
        .innerJoin(flashSales, eq(flashSaleProducts.flashSaleId, flashSales.id))
        .where(eq(flashSaleProducts.flashSaleId, sale.id));
      for (const p of saleProds) {
        const discount = p.overrideDiscount ? Number(p.overrideDiscount) : Number(p.discountValue);
        const base = Number(p.productBasePrice);
        const salePrice = p.discountType === "percentage"
          ? base * (1 - discount / 100)
          : base - discount;
        result.push({ ...p, salePrice: Math.max(0, salePrice).toFixed(2) });
      }
    }
    return result;
  }),

  list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    return db.select().from(flashSales).orderBy(desc(flashSales.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [sale] = await db.select().from(flashSales).where(eq(flashSales.id, input.id)).limit(1);
      if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
      const saleProducts = await db
        .select({
          id: flashSaleProducts.id,
          productId: flashSaleProducts.productId,
          overrideDiscount: flashSaleProducts.overrideDiscount,
          productNameEn: products.nameEn,
          productNameAr: products.nameAr,
          productBasePrice: products.basePrice,
        })
        .from(flashSaleProducts)
        .innerJoin(products, eq(flashSaleProducts.productId, products.id))
        .where(eq(flashSaleProducts.flashSaleId, input.id));
      return { ...sale, products: saleProducts };
    }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.number().min(0),
      startsAt: z.string(),
      endsAt: z.string(),
      isActive: z.boolean().default(true),
      bannerText: z.string().optional(),
      bannerTextAr: z.string().optional(),
      productIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, productIds, ...data } = input;
      const values = {
        ...data,
        discountValue: String(data.discountValue),
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      };
      let saleId = id;
      if (id) {
        await db.update(flashSales).set(values).where(eq(flashSales.id, id));
      } else {
        const [result] = await db.insert(flashSales).values(values);
        saleId = (result as any).insertId;
      }
      if (productIds !== undefined && saleId) {
        await db.delete(flashSaleProducts).where(eq(flashSaleProducts.flashSaleId, saleId));
        if (productIds.length > 0) {
          await db.insert(flashSaleProducts).values(
            productIds.map((pid) => ({ flashSaleId: saleId!, productId: pid }))
          );
        }
      }
      return { id: saleId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(flashSales).where(eq(flashSales.id, input.id));
      return { success: true };
    }),
});

// ─── Product Bundles Router ───────────────────────────────────────────────────
const bundlesRouter = router({
  list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const bundles = await db
      .select()
      .from(productBundles)
      .where(eq(productBundles.isActive, true))
      .orderBy(productBundles.createdAt);
    return bundles;
  }),

  listAdmin: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    return db.select().from(productBundles).orderBy(desc(productBundles.createdAt));
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [bundle] = await db.select().from(productBundles).where(eq(productBundles.slug, input.slug)).limit(1);
      if (!bundle) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db
        .select({
          id: productBundleItems.id,
          productId: productBundleItems.productId,
          variantId: productBundleItems.variantId,
          quantity: productBundleItems.quantity,
          productNameEn: products.nameEn,
          productNameAr: products.nameAr,
          productImages: products.images,
          productBasePrice: products.basePrice,
        })
        .from(productBundleItems)
        .innerJoin(products, eq(productBundleItems.productId, products.id))
        .where(eq(productBundleItems.bundleId, bundle.id));
      return { ...bundle, items };
    }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      slug: z.string().min(1),
      imageUrl: z.string().optional(),
      originalPrice: z.number().min(0),
      bundlePrice: z.number().min(0),
      isActive: z.boolean().default(true),
      stockLimit: z.number().optional(),
      items: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        quantity: z.number().min(1).default(1),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, items, ...data } = input;
      const values = {
        ...data,
        originalPrice: String(data.originalPrice),
        bundlePrice: String(data.bundlePrice),
      };
      let bundleId = id;
      if (id) {
        await db.update(productBundles).set(values).where(eq(productBundles.id, id));
      } else {
        const [result] = await db.insert(productBundles).values(values);
        bundleId = (result as any).insertId;
      }
      if (items !== undefined && bundleId) {
        await db.delete(productBundleItems).where(eq(productBundleItems.bundleId, bundleId));
        if (items.length > 0) {
          await db.insert(productBundleItems).values(
            items.map((item) => ({ bundleId: bundleId!, ...item, variantId: item.variantId ?? null }))
          );
        }
      }
      return { id: bundleId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(productBundles).where(eq(productBundles.id, input.id));
      return { success: true };
    }),
});

// ─── Product Q&A Router ───────────────────────────────────────────────────────
const qaRouter = router({
  list: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return db
        .select()
        .from(productQuestions)
        .where(and(eq(productQuestions.productId, input.productId), eq(productQuestions.isPublished, true)))
        .orderBy(desc(productQuestions.createdAt));
    }),

  listAdmin: protectedProcedure
    .input(z.object({ productId: z.number().optional(), unansweredOnly: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const conditions = [];
      if (input.productId) conditions.push(eq(productQuestions.productId, input.productId));
      if (input.unansweredOnly) conditions.push(isNull(productQuestions.answer));
      return db
        .select()
        .from(productQuestions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(productQuestions.createdAt));
    }),

  ask: publicProcedure
    .input(z.object({
      productId: z.number(),
      question: z.string().min(5).max(1000),
      guestName: z.string().optional(),
      guestEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const userId = (ctx as any).user?.id ?? null;
      await db.insert(productQuestions).values({
        productId: input.productId,
        userId,
        guestName: input.guestName ?? null,
        guestEmail: input.guestEmail ?? null,
        question: input.question,
        isPublished: false,
      });
      return { success: true };
    }),

  answer: protectedProcedure
    .input(z.object({
      id: z.number(),
      answer: z.string().min(1),
      isPublished: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(productQuestions).set({
        answer: input.answer,
        answeredBy: ctx.user.id,
        answeredAt: new Date(),
        isPublished: input.isPublished,
      }).where(eq(productQuestions.id, input.id));
      return { success: true };
    }),

  togglePublish: protectedProcedure
    .input(z.object({ id: z.number(), isPublished: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(productQuestions).set({ isPublished: input.isPublished }).where(eq(productQuestions.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(productQuestions).where(eq(productQuestions.id, input.id));
      return { success: true };
    }),
});

// ─── Loyalty Points Router ────────────────────────────────────────────────────
const loyaltyRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const rows = await db
      .select({ total: sql<number>`COALESCE(SUM(points), 0)` })
      .from(loyaltyPoints)
      .where(and(
        eq(loyaltyPoints.userId, ctx.user.id),
        or(isNull(loyaltyPoints.expiresAt), gt(loyaltyPoints.expiresAt, new Date()))
      ));
    return { balance: Number(rows[0]?.total ?? 0) };
  }),

  history: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    return db
      .select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.userId, ctx.user.id))
      .orderBy(desc(loyaltyPoints.createdAt))
      .limit(50);
  }),

  settings: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(loyaltySettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }),

  updateSettings: protectedProcedure
    .input(z.object({
      points_per_aed: z.string().optional(),
      aed_per_point: z.string().optional(),
      min_redeem_points: z.string().optional(),
      expiry_days: z.string().optional(),
      enabled: z.string().optional(),
      referral_points_referrer: z.string().optional(),
      referral_points_referee: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          await db
            .insert(loyaltySettings)
            .values({ key, value })
            .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
        }
      }
      return { success: true };
    }),

  adminAdjust: protectedProcedure
    .input(z.object({
      userId: z.number(),
      points: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(loyaltyPoints).values({
        userId: input.userId,
        points: input.points,
        type: "manual_adjust",
        description: input.description ?? "Manual adjustment by admin",
      });
      return { success: true };
    }),

  listUsers: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const rows = await (db as any).execute(
      sql`SELECT u.id, u.name, u.email, COALESCE(SUM(lp.points), 0) as balance
          FROM users u
          LEFT JOIN loyalty_points lp ON lp.userId = u.id
          GROUP BY u.id, u.name, u.email
          ORDER BY balance DESC
          LIMIT 100`
    );
    return (rows as unknown as [any[]])[0] as Array<{ id: number; name: string; email: string; balance: number }>;
  }),
});

// ─── Order Tracking Router ────────────────────────────────────────────────────
const orderTrackingRouter = router({
  getEvents: publicProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [order] = await db
        .select({ id: orders.id, status: orders.status, orderNumber: orders.orderNumber })
        .from(orders)
        .where(eq(orders.orderNumber, input.orderNumber))
        .limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const events = await db
        .select()
        .from(orderTrackingEvents)
        .where(eq(orderTrackingEvents.orderId, order.id))
        .orderBy(orderTrackingEvents.createdAt);
      return { order, events };
    }),

  addEvent: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(orderTrackingEvents).values({
        ...input,
        titleAr: input.titleAr ?? null,
        description: input.description ?? null,
        location: input.location ?? null,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),
});

// ─── Recently Viewed Router ───────────────────────────────────────────────────
const recentlyViewedRouter = router({
  track: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Upsert — update viewedAt if already exists
      const existing = await db
        .select({ id: recentlyViewed.id })
        .from(recentlyViewed)
        .where(and(eq(recentlyViewed.userId, ctx.user.id), eq(recentlyViewed.productId, input.productId)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(recentlyViewed).set({ viewedAt: new Date() }).where(eq(recentlyViewed.id, existing[0].id));
      } else {
        await db.insert(recentlyViewed).values({ userId: ctx.user.id, productId: input.productId });
        // Keep only last 20
        const all = await db
          .select({ id: recentlyViewed.id })
          .from(recentlyViewed)
          .where(eq(recentlyViewed.userId, ctx.user.id))
          .orderBy(desc(recentlyViewed.viewedAt));
        if (all.length > 20) {
          const toDelete = all.slice(20).map((r) => r.id);
          await db.delete(recentlyViewed).where(inArray(recentlyViewed.id, toDelete));
        }
      }
      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    return db
      .select({
        id: recentlyViewed.id,
        productId: recentlyViewed.productId,
        viewedAt: recentlyViewed.viewedAt,
        productNameEn: products.nameEn,
        productNameAr: products.nameAr,
        productSlug: products.slug,
        productImages: products.images,
        productBasePrice: products.basePrice,
        productComparePrice: products.comparePrice,
      })
      .from(recentlyViewed)
      .innerJoin(products, eq(recentlyViewed.productId, products.id))
      .where(eq(recentlyViewed.userId, ctx.user.id))
      .orderBy(desc(recentlyViewed.viewedAt))
      .limit(10);
  }),
});

// ─── Review Votes Router ──────────────────────────────────────────────────────
const reviewVotesRouter = router({
  vote: protectedProcedure
    .input(z.object({ reviewId: z.number(), vote: z.enum(["helpful", "not_helpful"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select()
        .from(reviewVotes)
        .where(and(eq(reviewVotes.reviewId, input.reviewId), eq(reviewVotes.userId, ctx.user.id)))
        .limit(1);
      if (existing.length > 0) {
        if (existing[0].vote === input.vote) {
          await db.delete(reviewVotes).where(eq(reviewVotes.id, existing[0].id));
          return { action: "removed" };
        }
        await db.update(reviewVotes).set({ vote: input.vote }).where(eq(reviewVotes.id, existing[0].id));
        return { action: "updated" };
      }
      await db.insert(reviewVotes).values({ reviewId: input.reviewId, userId: ctx.user.id, vote: input.vote });
      return { action: "added" };
    }),

  counts: publicProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await (db as any).execute(
        sql`SELECT vote, COUNT(*) as count FROM review_votes WHERE reviewId = ${input.reviewId} GROUP BY vote`
      );
      const data = (rows as unknown as [any[]])[0] as Array<{ vote: string; count: number | string }>;
      return {
        helpful: Number(data.find((r: any) => r.vote === "helpful")?.count ?? 0),
        not_helpful: Number(data.find((r: any) => r.vote === "not_helpful")?.count ?? 0),
      };
    }),
});

// ─── Feature Flags Router ─────────────────────────────────────────────────────
const featureFlagsRouter = router({
  list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(featureFlags).orderBy(featureFlags.feature);
    return rows;
  }),

  toggle: protectedProcedure
    .input(z.object({ feature: z.string(), isEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(featureFlags)
        .values({ feature: input.feature, isEnabled: input.isEnabled, updatedBy: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { isEnabled: input.isEnabled, updatedAt: new Date(), updatedBy: ctx.user.id } });
      return { success: true };
    }),

  updateConfig: protectedProcedure
    .input(z.object({ feature: z.string(), config: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .insert(featureFlags)
        .values({ feature: input.feature, isEnabled: true, config: input.config, updatedBy: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { config: input.config, updatedAt: new Date(), updatedBy: ctx.user.id } });
      return { success: true };
    }),

  isEnabled: publicProcedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      return { isEnabled: await isFeatureEnabled(input.feature) };
    }),
});

// ─── Referral Router ──────────────────────────────────────────────────────────
const referralRouter = router({
  myCode: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    const existing = await db
      .select()
      .from(referralCodes)
      .where(and(eq(referralCodes.userId, ctx.user.id), eq(referralCodes.isActive, true)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    // Auto-generate code
    const code = `REF${ctx.user.id}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const [result] = await db.insert(referralCodes).values({ userId: ctx.user.id, code });
    const [newCode] = await db.select().from(referralCodes).where(eq(referralCodes.id, (result as any).insertId)).limit(1);
    return newCode;
  }),

  validate: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [ref] = await db
        .select({ id: referralCodes.id, userId: referralCodes.userId, usedCount: referralCodes.usedCount })
        .from(referralCodes)
        .where(and(eq(referralCodes.code, input.code.toUpperCase()), eq(referralCodes.isActive, true)))
        .limit(1);
      return { valid: !!ref, referralCodeId: ref?.id };
    }),
});

// ─── Search Router ────────────────────────────────────────────────────────────
const searchRouter = router({
  search: publicProcedure
    .input(z.object({
      q: z.string().min(1),
      categoryId: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      tags: z.array(z.string()).optional(),
      sortBy: z.enum(["relevance", "price_asc", "price_desc", "newest", "popular"]).default("relevance"),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { q, categoryId, minPrice, maxPrice, sortBy, page, limit } = input;
      const offset = (page - 1) * limit;
      const searchTerm = `%${q}%`;

      const conditions = [
        eq(products.isActive, true),
        or(
          like(products.nameEn, searchTerm),
          like(products.nameAr, searchTerm),
          like(products.descriptionEn, searchTerm),
          like(products.tags, searchTerm),
          like(products.sku, searchTerm),
        )!,
      ];
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));
      if (minPrice !== undefined) conditions.push(gte(products.basePrice, String(minPrice)));
      if (maxPrice !== undefined) conditions.push(lte(products.basePrice, String(maxPrice)));

      const orderBy = sortBy === "price_asc" ? products.basePrice
        : sortBy === "price_desc" ? desc(products.basePrice)
        : sortBy === "newest" ? desc(products.createdAt)
        : desc(products.sortOrder);

      const [results, countResult] = await Promise.all([
        db.select().from(products).where(and(...conditions)).orderBy(orderBy).limit(limit).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(products).where(and(...conditions)),
      ]);

      return {
        products: results,
        total: Number(countResult[0]?.count ?? 0),
        page,
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      };
    }),

  suggestions: publicProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const searchTerm = `%${input.q}%`;
      return db
        .select({ id: products.id, nameEn: products.nameEn, nameAr: products.nameAr, slug: products.slug })
        .from(products)
        .where(and(
          eq(products.isActive, true),
          or(like(products.nameEn, searchTerm), like(products.nameAr, searchTerm))!
        ))
        .limit(8);
    }),
});

// ─── Abandoned Cart Router ────────────────────────────────────────────────────
const abandonedCartRouter = router({
  track: protectedProcedure
    .input(z.object({
      cartSnapshot: z.string(),
      totalValue: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select({ id: abandonedCarts.id })
        .from(abandonedCarts)
        .where(and(eq(abandonedCarts.userId, ctx.user.id), isNull(abandonedCarts.recoveredAt)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(abandonedCarts).set({
          cartSnapshot: input.cartSnapshot,
          totalValue: String(input.totalValue),
          updatedAt: new Date(),
        }).where(eq(abandonedCarts.id, existing[0].id));
      } else {
        await db.insert(abandonedCarts).values({
          userId: ctx.user.id,
          cartSnapshot: input.cartSnapshot,
          totalValue: String(input.totalValue),
        });
      }
      return { success: true };
    }),

  markRecovered: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
    await db.update(abandonedCarts).set({ recoveredAt: new Date() })
      .where(and(eq(abandonedCarts.userId, ctx.user.id), isNull(abandonedCarts.recoveredAt)));
    return { success: true };
  }),

  listAdmin: protectedProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const offset = (input.page - 1) * input.limit;
      const rows = await (db as any).execute(
        sql`SELECT ac.*, u.name as userName, u.email as userEmail
            FROM abandoned_carts ac
            LEFT JOIN users u ON u.id = ac.userId
            WHERE ac.recoveredAt IS NULL
            ORDER BY ac.updatedAt DESC
            LIMIT ${input.limit} OFFSET ${offset}`
      );
      return (rows as unknown as [any[]])[0] as any[];
    }),
});

// ─── Main E-Commerce Router ───────────────────────────────────────────────────
export const ecommerceRouter = router({
  wishlist: wishlistRouter,
  flashSales: flashSalesRouter,
  bundles: bundlesRouter,
  qa: qaRouter,
  loyalty: loyaltyRouter,
  orderTracking: orderTrackingRouter,
  recentlyViewed: recentlyViewedRouter,
  reviewVotes: reviewVotesRouter,
  featureFlags: featureFlagsRouter,
  referral: referralRouter,
  search: searchRouter,
  abandonedCart: abandonedCartRouter,
});
