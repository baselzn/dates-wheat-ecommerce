import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  posHeldOrders,
  posOrderItems,
  posOrders,
  posPaymentMethods,
  posSettings,
  posSessions,
  stockMovements,
  users,
  warehouses,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

function generateOrderNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

// ─── Payment Methods ──────────────────────────────────────────────────────────
const paymentMethodsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(posPaymentMethods).orderBy(posPaymentMethods.sortOrder);
  }),
  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(64),
      type: z.enum(["cash", "card", "bank_transfer", "store_credit", "other"]),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id) {
        await db.update(posPaymentMethods).set({
          name: input.name, type: input.type,
          isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0,
        }).where(eq(posPaymentMethods.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(posPaymentMethods).values({
          name: input.name, type: input.type,
          isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0,
        });
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        return { id: (row as any)[0].id as number };
      }
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posPaymentMethods).where(eq(posPaymentMethods.id, input.id));
      return { success: true };
    }),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
const sessionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      status: z.enum(["open", "closed", "all"]).default("all"),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const statusFilter = input?.status && input.status !== "all"
        ? eq(posSessions.status, input.status) : undefined;
      return db
        .select({
          id: posSessions.id,
          sessionNumber: posSessions.sessionNumber,
          cashierId: posSessions.cashierId,
          cashierName: users.name,
          warehouseId: posSessions.warehouseId,
          warehouseName: warehouses.name,
          status: posSessions.status,
          openingCash: posSessions.openingCash,
          closingCash: posSessions.closingCash,
          expectedCash: posSessions.expectedCash,
          cashVariance: posSessions.cashVariance,
          totalSales: posSessions.totalSales,
          totalOrders: posSessions.totalOrders,
          notes: posSessions.notes,
          openedAt: posSessions.openedAt,
          closedAt: posSessions.closedAt,
        })
        .from(posSessions)
        .leftJoin(users, eq(posSessions.cashierId, users.id))
        .leftJoin(warehouses, eq(posSessions.warehouseId, warehouses.id))
        .where(statusFilter)
        .orderBy(desc(posSessions.openedAt))
        .limit(input?.limit ?? 20);
    }),
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [session] = await db
      .select()
      .from(posSessions)
      .where(and(eq(posSessions.cashierId, ctx.user!.id), eq(posSessions.status, "open")))
      .limit(1);
    return session ?? null;
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "NOT_FOUND" });
      const [session] = await db
        .select({
          id: posSessions.id,
          sessionNumber: posSessions.sessionNumber,
          status: posSessions.status,
          openingCash: posSessions.openingCash,
          closingCash: posSessions.closingCash,
          expectedCash: posSessions.expectedCash,
          cashVariance: posSessions.cashVariance,
          totalSales: posSessions.totalSales,
          totalOrders: posSessions.totalOrders,
          notes: posSessions.notes,
          openedAt: posSessions.openedAt,
          closedAt: posSessions.closedAt,
          warehouseId: posSessions.warehouseId,
          warehouseName: warehouses.name,
          cashierName: users.name,
        })
        .from(posSessions)
        .leftJoin(warehouses, eq(posSessions.warehouseId, warehouses.id))
        .leftJoin(users, eq(posSessions.cashierId, users.id))
        .where(eq(posSessions.id, input.id))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const [payBreakdown] = await db.execute(sql`
        SELECT paymentMethod, COUNT(*) as count, COALESCE(SUM(total),0) as total
        FROM pos_orders WHERE sessionId = ${input.id} AND status = 'completed'
        GROUP BY paymentMethod
      `);
      return { ...session, paymentBreakdown: Array.isArray(payBreakdown) ? payBreakdown : [] };
    }),
  open: protectedProcedure
    .input(z.object({
      warehouseId: z.number(),
      openingCash: z.string().default("0"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select().from(posSessions)
        .where(and(eq(posSessions.cashierId, ctx.user!.id), eq(posSessions.status, "open")))
        .limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You already have an open session" });
      const sessionNumber = generateOrderNumber("SES");
      await db.insert(posSessions).values({
        sessionNumber, cashierId: ctx.user!.id,
        warehouseId: input.warehouseId,
        openingCash: input.openingCash, status: "open",
        notes: input.notes ?? null,
      });
      const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      return { id: (row as any)[0].id as number, sessionNumber };
    }),
  close: protectedProcedure
    .input(z.object({
      id: z.number(),
      closingCash: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [session] = await db.select().from(posSessions).where(eq(posSessions.id, input.id)).limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const [cashRow] = await db.execute(sql`
        SELECT COALESCE(SUM(amountPaid),0) as cashTotal
        FROM pos_orders WHERE sessionId = ${input.id} AND paymentMethod = 'cash' AND status = 'completed'
      `);
      const cashTotal = parseFloat((cashRow as any)[0]?.cashTotal ?? "0");
      const expectedCash = parseFloat(session.openingCash) + cashTotal;
      const closingCash = parseFloat(input.closingCash);
      const variance = closingCash - expectedCash;
      await db.update(posSessions).set({
        status: "closed", closingCash: input.closingCash,
        expectedCash: String(expectedCash), cashVariance: String(variance),
        closedAt: new Date(), notes: input.notes ?? session.notes,
      }).where(eq(posSessions.id, input.id));
      return { success: true, expectedCash, closingCash, variance };
    }),
  reopen: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSessions).set({
        status: "open", closedAt: null, closingCash: null, expectedCash: null, cashVariance: null,
      }).where(eq(posSessions.id, input.id));
      return { success: true };
    }),
});

// ─── Held Orders ──────────────────────────────────────────────────────────────
const heldOrdersRouter = router({
  list: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posHeldOrders)
        .where(eq(posHeldOrders.sessionId, input.sessionId))
        .orderBy(desc(posHeldOrders.createdAt));
    }),
  hold: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      label: z.string().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        productName: z.string(),
        sku: z.string().optional(),
        qty: z.number(),
        unitPrice: z.number(),
        discountAmount: z.number().default(0),
        imageUrl: z.string().optional(),
      })),
      discountAmount: z.number().default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(posHeldOrders).values({
        sessionId: input.sessionId,
        label: input.label ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        items: JSON.stringify(input.items),
        discountAmount: String(input.discountAmount),
        notes: input.notes ?? null,
      });
      return { success: true };
    }),
  retrieve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [held] = await db.select().from(posHeldOrders).where(eq(posHeldOrders.id, input.id)).limit(1);
      if (!held) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(posHeldOrders).where(eq(posHeldOrders.id, input.id));
      return { ...held, items: JSON.parse(held.items) as any[] };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posHeldOrders).where(eq(posHeldOrders.id, input.id));
      return { success: true };
    }),
});

// ─── Orders ───────────────────────────────────────────────────────────────────
const ordersRouter = router({
  list: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(["completed", "refunded", "voided", "all"]).default("all"),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input?.sessionId) conditions.push(eq(posOrders.sessionId, input.sessionId));
      if (input?.status && input.status !== "all") conditions.push(eq(posOrders.status, input.status));
      if (input?.dateFrom) conditions.push(gte(posOrders.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo) conditions.push(lte(posOrders.createdAt, new Date(input.dateTo)));
      return db.select({
        id: posOrders.id,
        orderNumber: posOrders.orderNumber,
        sessionId: posOrders.sessionId,
        customerId: posOrders.customerId,
        customerName: posOrders.customerName,
        customerPhone: posOrders.customerPhone,
        subtotal: posOrders.subtotal,
        discountAmount: posOrders.discountAmount,
        vatAmount: posOrders.vatAmount,
        total: posOrders.total,
        paymentMethod: posOrders.paymentMethod,
        amountPaid: posOrders.amountPaid,
        change: posOrders.change,
        status: posOrders.status,
        receiptPrinted: posOrders.receiptPrinted,
        notes: posOrders.notes,
        createdAt: posOrders.createdAt,
      }).from(posOrders)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(posOrders.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.id)).limit(1);
      if (!order) return null;
      const items = await db.select().from(posOrderItems).where(eq(posOrderItems.posOrderId, input.id));
      return { ...order, items };
    }),
  create: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        productName: z.string(),
        sku: z.string().optional(),
        qty: z.string(),
        unitPrice: z.string(),
        discountAmount: z.string().default("0"),
      })),
      discountAmount: z.string().default("0"),
      vatAmount: z.string().default("0"),
      paymentMethod: z.string(),
      amountPaid: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [session] = await db.select().from(posSessions).where(eq(posSessions.id, input.sessionId)).limit(1);
      if (!session || session.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "POS session is not open" });
      }
      let subtotal = 0;
      for (const item of input.items) {
        subtotal += parseFloat(item.unitPrice) * parseFloat(item.qty) - parseFloat(item.discountAmount);
      }
      const total = subtotal - parseFloat(input.discountAmount) + parseFloat(input.vatAmount);
      const change = parseFloat(input.amountPaid) - total;
      const orderNumber = generateOrderNumber("POS");
      await db.insert(posOrders).values({
        orderNumber, sessionId: input.sessionId,
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        subtotal: String(subtotal),
        discountAmount: input.discountAmount,
        vatAmount: input.vatAmount,
        total: String(total),
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
        change: String(Math.max(0, change)),
        status: "completed",
        notes: input.notes ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const orderId = (idRow as any)[0].id as number;
      for (const item of input.items) {
        const lineTotal = parseFloat(item.unitPrice) * parseFloat(item.qty) - parseFloat(item.discountAmount);
        await db.insert(posOrderItems).values({
          posOrderId: orderId, productId: item.productId,
          variantId: item.variantId ?? null, productName: item.productName,
          sku: item.sku ?? null, qty: item.qty, unitPrice: item.unitPrice,
          discountAmount: item.discountAmount, lineTotal: String(lineTotal),
        });
        const negQty = String(-parseFloat(item.qty));
        await db.insert(stockMovements).values({
          type: "pos_sale", warehouseId: session.warehouseId,
          productId: item.productId, variantId: item.variantId ?? null,
          qty: negQty, refType: "pos_order", refId: orderId,
          createdBy: ctx.user?.id ?? null,
        });
        await db.execute(sql`
          INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
          VALUES (${session.warehouseId}, ${item.productId}, ${item.variantId ?? null}, ${negQty}, 0, 0)
          ON DUPLICATE KEY UPDATE qty = qty + ${negQty}
        `);
      }
      await db.update(posSessions).set({
        totalSales: sql`totalSales + ${total}`,
        totalOrders: sql`totalOrders + 1`,
      }).where(eq(posSessions.id, input.sessionId));
      return { id: orderId, orderNumber, total, change: Math.max(0, change) };
    }),
  refund: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed orders can be refunded" });
      }
      const [session] = await db.select().from(posSessions).where(eq(posSessions.id, order.sessionId)).limit(1);
      await db.update(posOrders).set({ status: "refunded", notes: input.reason ?? null }).where(eq(posOrders.id, input.id));
      const items = await db.select().from(posOrderItems).where(eq(posOrderItems.posOrderId, input.id));
      for (const item of items) {
        await db.insert(stockMovements).values({
          type: "adjustment", warehouseId: session?.warehouseId ?? 1,
          productId: item.productId, variantId: item.variantId ?? null,
          qty: item.qty, notes: `Refund for POS order #${order.orderNumber}`,
          refType: "pos_order", refId: order.id, createdBy: ctx.user?.id ?? null,
        });
        await db.execute(sql`
          INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
          VALUES (${session?.warehouseId ?? 1}, ${item.productId}, ${item.variantId ?? null}, ${item.qty}, 0, 0)
          ON DUPLICATE KEY UPDATE qty = qty + ${item.qty}
        `);
      }
      await db.update(posSessions).set({
        totalSales: sql`totalSales - ${order.total}`,
        totalOrders: sql`totalOrders - 1`,
      }).where(eq(posSessions.id, order.sessionId));
      return { success: true };
    }),
  void: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOrders).set({ status: "voided", notes: input.reason ?? null }).where(eq(posOrders.id, input.id));
      return { success: true };
    }),
  markReceiptPrinted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOrders).set({ receiptPrinted: true }).where(eq(posOrders.id, input.id));
      return { success: true };
    }),
});

// ─── POS Settings ─────────────────────────────────────────────────────────────
const settingsRouter = router({
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {} as Record<string, string | null>;
    const rows = await db.select().from(posSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value])) as Record<string, string | null>;
  }),
  update: protectedProcedure
    .input(z.record(z.string(), z.string().nullable()))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const [key, value] of Object.entries(input)) {
        await db.execute(sql`
          INSERT INTO pos_settings (\`key\`, value) VALUES (${key}, ${value})
          ON DUPLICATE KEY UPDATE value = ${value}, updatedAt = NOW()
        `);
      }
      return { success: true };
    }),
});

// ─── POS Dashboard ────────────────────────────────────────────────────────────
const dashboardRouter = router({
  summary: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const fromClause = input?.dateFrom ? sql`AND createdAt >= ${new Date(input.dateFrom)}` : sql``;
      const toClause = input?.dateTo ? sql`AND createdAt <= ${new Date(input.dateTo)}` : sql``;
      const [totalsRow] = await db.execute(sql`
        SELECT COUNT(*) as totalOrders, COALESCE(SUM(total),0) as totalRevenue,
               COALESCE(SUM(vatAmount),0) as totalVat, COALESCE(SUM(discountAmount),0) as totalDiscount,
               COALESCE(AVG(total),0) as avgOrderValue
        FROM pos_orders WHERE status = 'completed' ${fromClause} ${toClause}
      `);
      const payBreakResult = await db.execute(sql`
        SELECT paymentMethod, COUNT(*) as count, COALESCE(SUM(total),0) as total
        FROM pos_orders WHERE status = 'completed' ${fromClause} ${toClause}
        GROUP BY paymentMethod
      `);
      const topProdResult = await db.execute(sql`
        SELECT oi.productName, SUM(oi.qty) as totalQty, SUM(oi.lineTotal) as totalRevenue
        FROM pos_order_items oi JOIN pos_orders o ON o.id = oi.posOrderId
        WHERE o.status = 'completed' ${fromClause} ${toClause}
        GROUP BY oi.productName ORDER BY totalRevenue DESC LIMIT 10
      `);
      const dailyResult = await db.execute(sql`
        SELECT DATE(createdAt) as date, COUNT(*) as orders, SUM(total) as revenue
        FROM pos_orders WHERE status = 'completed' ${fromClause} ${toClause}
        GROUP BY DATE(createdAt) ORDER BY date DESC LIMIT 30
      `);
      const payBreakRow = (payBreakResult as unknown as any[][])[0] ?? payBreakResult;
      const topProdRow = (topProdResult as unknown as any[][])[0] ?? topProdResult;
      const dailyRow = (dailyResult as unknown as any[][])[0] ?? dailyResult;
      return {
        totals: (totalsRow as any)[0] ?? {},
        paymentBreakdown: payBreakRow as any[],
        topProducts: Array.isArray(topProdRow) ? topProdRow : [],
        dailySales: Array.isArray(dailyRow) ? [...dailyRow].reverse() : [],
      };
    }),
});

// ─── Customer Lookup ──────────────────────────────────────────────────────────
const customersRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = `%${input.query}%`;
      const [rows] = await db.execute(sql`
        SELECT id, name, phone, email FROM users
        WHERE (name LIKE ${q} OR phone LIKE ${q} OR email LIKE ${q}) AND isActive = 1
        LIMIT 10
      `);
      return (rows as unknown as any[][])[0] ?? (rows as unknown as any[]);
    }),
  getHistory: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: posOrders.id, orderNumber: posOrders.orderNumber,
        total: posOrders.total, paymentMethod: posOrders.paymentMethod,
        status: posOrders.status, createdAt: posOrders.createdAt,
      }).from(posOrders)
        .where(eq(posOrders.customerPhone, input.phone))
        .orderBy(desc(posOrders.createdAt))
        .limit(20);
    }),
});

export const posRouter = router({
  paymentMethods: paymentMethodsRouter,
  sessions: sessionsRouter,
  heldOrders: heldOrdersRouter,
  orders: ordersRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
  customers: customersRouter,
});
