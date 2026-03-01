import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  posOrderItems,
  posOrders,
  posPaymentMethods,
  posSessions,
  products,
  stockLevels,
  stockMovements,
  users,
} from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
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
          name: input.name,
          type: input.type,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
        }).where(eq(posPaymentMethods.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(posPaymentMethods).values({
          name: input.name,
          type: input.type,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
        });
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        return { id: (row as any)[0].id as number };
      }
    }),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
const sessionsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: posSessions.id,
          sessionNumber: posSessions.sessionNumber,
          cashierId: posSessions.cashierId,
          cashierName: users.name,
          warehouseId: posSessions.warehouseId,
          status: posSessions.status,
          openingCash: posSessions.openingCash,
          closingCash: posSessions.closingCash,
          expectedCash: posSessions.expectedCash,
          cashVariance: posSessions.cashVariance,
          totalSales: posSessions.totalSales,
          totalOrders: posSessions.totalOrders,
          openedAt: posSessions.openedAt,
          closedAt: posSessions.closedAt,
        })
        .from(posSessions)
        .leftJoin(users, eq(posSessions.cashierId, users.id))
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

  open: protectedProcedure
    .input(z.object({
      warehouseId: z.number(),
      openingCash: z.string().default("0"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check no existing open session
      const [existing] = await db.select().from(posSessions)
        .where(and(eq(posSessions.cashierId, ctx.user!.id), eq(posSessions.status, "open")))
        .limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You already have an open session" });
      const sessionNumber = generateOrderNumber("SES");
      await db.insert(posSessions).values({
        sessionNumber,
        cashierId: ctx.user!.id,
        warehouseId: input.warehouseId,
        openingCash: input.openingCash,
        status: "open",
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
      // Calculate cash sales total for expected cash
      const cashSales = await db.execute(sql`
        SELECT COALESCE(SUM(total), 0) as cashTotal
        FROM pos_orders
        WHERE sessionId = ${input.id} AND paymentMethod = 'cash' AND status = 'completed'
      `);
      const cashTotal = parseFloat((cashSales[0] as any)[0]?.cashTotal ?? "0");
      const expectedCash = parseFloat(session.openingCash) + cashTotal;
      const closingCash = parseFloat(input.closingCash);
      const variance = closingCash - expectedCash;
      await db.update(posSessions).set({
        status: "closed",
        closingCash: input.closingCash,
        expectedCash: String(expectedCash),
        cashVariance: String(variance),
        closedAt: new Date(),
        notes: input.notes ?? null,
      }).where(eq(posSessions.id, input.id));
      return { success: true, expectedCash, variance };
    }),
});

// ─── Orders ───────────────────────────────────────────────────────────────────
const ordersRouter = router({
  list: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: posOrders.id,
          orderNumber: posOrders.orderNumber,
          sessionId: posOrders.sessionId,
          customerId: posOrders.customerId,
          customerName: posOrders.customerName,
          subtotal: posOrders.subtotal,
          discountAmount: posOrders.discountAmount,
          vatAmount: posOrders.vatAmount,
          total: posOrders.total,
          paymentMethod: posOrders.paymentMethod,
          amountPaid: posOrders.amountPaid,
          change: posOrders.change,
          status: posOrders.status,
          createdAt: posOrders.createdAt,
        })
        .from(posOrders)
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
      const items = await db
        .select({
          id: posOrderItems.id,
          productId: posOrderItems.productId,
          productName: posOrderItems.productName,
          variantId: posOrderItems.variantId,
          sku: posOrderItems.sku,
          qty: posOrderItems.qty,
          unitPrice: posOrderItems.unitPrice,
          discountAmount: posOrderItems.discountAmount,
          lineTotal: posOrderItems.lineTotal,
        })
        .from(posOrderItems)
        .where(eq(posOrderItems.posOrderId, input.id));
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
      // Verify session is open
      const [session] = await db.select().from(posSessions).where(eq(posSessions.id, input.sessionId)).limit(1);
      if (!session || session.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "POS session is not open" });
      }
      // Calculate totals
      let subtotal = 0;
      for (const item of input.items) {
        const lineTotal = parseFloat(item.unitPrice) * parseFloat(item.qty) - parseFloat(item.discountAmount);
        subtotal += lineTotal;
      }
      const discount = parseFloat(input.discountAmount);
      const vat = parseFloat(input.vatAmount);
      const total = subtotal - discount + vat;
      const change = parseFloat(input.amountPaid) - total;
      const orderNumber = generateOrderNumber("POS");
      await db.insert(posOrders).values({
        orderNumber,
        sessionId: input.sessionId,
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
      // Insert order items and deduct stock
      for (const item of input.items) {
        const lineTotal = parseFloat(item.unitPrice) * parseFloat(item.qty) - parseFloat(item.discountAmount);
        await db.insert(posOrderItems).values({
          posOrderId: orderId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          productName: item.productName,
          sku: item.sku ?? null,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          lineTotal: String(lineTotal),
        });
        // Deduct from stock
        const negQty = String(-parseFloat(item.qty));
        await db.insert(stockMovements).values({
          type: "pos_sale",
          warehouseId: session.warehouseId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          qty: negQty,
          refType: "pos_order",
          refId: orderId,
          createdBy: ctx.user?.id ?? null,
        });
        await db.execute(sql`
          INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
          VALUES (${session.warehouseId}, ${item.productId}, ${item.variantId ?? null}, ${negQty}, 0, 0)
          ON DUPLICATE KEY UPDATE qty = qty + ${negQty}
        `);
      }
      // Update session totals
      await db.update(posSessions).set({
        totalSales: sql`totalSales + ${total}`,
        totalOrders: sql`totalOrders + 1`,
      }).where(eq(posSessions.id, input.sessionId));
      return { id: orderId, orderNumber, total, change: Math.max(0, change) };
    }),

  void: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOrders).set({ status: "voided", notes: input.reason ?? null }).where(eq(posOrders.id, input.id));
      return { success: true };
    }),
});

export const posRouter = router({
  paymentMethods: paymentMethodsRouter,
  sessions: sessionsRouter,
  orders: ordersRouter,
});
