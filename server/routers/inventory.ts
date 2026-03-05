import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  inventoryBatches,
  products,
  stockAdjustmentItems,
  stockAdjustments,
  stockLevels,
  stockMovements,
  stockTransferItems,
  stockTransfers,
  warehouses,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";

// ─── Warehouses ──────────────────────────────────────────────────────────────
const warehouseRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(warehouses).orderBy(warehouses.name);
  }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(128),
      code: z.string().min(1).max(32),
      location: z.string().max(256).optional(),
      address: z.string().optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id) {
        await db.update(warehouses).set({
          name: input.name,
          code: input.code,
          location: input.location ?? null,
          address: input.address ?? null,
          isDefault: input.isDefault ?? false,
          isActive: input.isActive ?? true,
        }).where(eq(warehouses.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(warehouses).values({
          name: input.name,
          code: input.code,
          location: input.location ?? null,
          address: input.address ?? null,
          isDefault: input.isDefault ?? false,
          isActive: input.isActive ?? true,
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
      await db.delete(warehouses).where(eq(warehouses.id, input.id));
      return { success: true };
    }),
});

// ─── Stock Levels ─────────────────────────────────────────────────────────────
const stockLevelsRouter = router({
  list: protectedProcedure
    .input(z.object({ warehouseId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const query = db
        .select({
          id: stockLevels.id,
          warehouseId: stockLevels.warehouseId,
          warehouseName: warehouses.name,
          productId: stockLevels.productId,
          productName: products.nameEn,
          productSku: products.sku,
          variantId: stockLevels.variantId,
          qty: stockLevels.qty,
          reservedQty: stockLevels.reservedQty,
          reorderPoint: stockLevels.reorderPoint,
          updatedAt: stockLevels.updatedAt,
        })
        .from(stockLevels)
        .leftJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
        .leftJoin(products, eq(stockLevels.productId, products.id));
      if (input?.warehouseId) {
        return query.where(eq(stockLevels.warehouseId, input.warehouseId));
      }
      return query;
    }),

  lowStock: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: stockLevels.id,
        warehouseId: stockLevels.warehouseId,
        warehouseName: warehouses.name,
        productId: stockLevels.productId,
        productName: products.nameEn,
        productSku: products.sku,
        qty: stockLevels.qty,
        reorderPoint: stockLevels.reorderPoint,
      })
      .from(stockLevels)
      .leftJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
      .leftJoin(products, eq(stockLevels.productId, products.id))
      .where(lt(stockLevels.qty, stockLevels.reorderPoint));
  }),

  setLevel: protectedProcedure
    .input(z.object({
      warehouseId: z.number(),
      productId: z.number(),
      variantId: z.number().optional(),
      qty: z.string(),
      reorderPoint: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(stockLevels).where(
        and(
          eq(stockLevels.warehouseId, input.warehouseId),
          eq(stockLevels.productId, input.productId),
        )
      ).limit(1);
      if (existing.length > 0) {
        await db.update(stockLevels).set({
          qty: input.qty,
          reorderPoint: input.reorderPoint ?? "0",
        }).where(eq(stockLevels.id, existing[0].id));
      } else {
        await db.insert(stockLevels).values({
          warehouseId: input.warehouseId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          qty: input.qty,
          reorderPoint: input.reorderPoint ?? "0",
        });
      }
      return { success: true };
    }),
});

// ─── Stock Movements ──────────────────────────────────────────────────────────
const movementsRouter = router({
  list: protectedProcedure
    .input(z.object({
      warehouseId: z.number().optional(),
      productId: z.number().optional(),
      type: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: stockMovements.id,
          type: stockMovements.type,
          warehouseId: stockMovements.warehouseId,
          warehouseName: warehouses.name,
          productId: stockMovements.productId,
          productName: products.nameEn,
          variantId: stockMovements.variantId,
          qty: stockMovements.qty,
          costPerUnit: stockMovements.costPerUnit,
          totalCost: stockMovements.totalCost,
          refType: stockMovements.refType,
          refId: stockMovements.refId,
          notes: stockMovements.notes,
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .orderBy(desc(stockMovements.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),

  create: protectedProcedure
    .input(z.object({
      type: z.enum(["purchase", "sale", "pos_sale", "adjustment", "transfer_in", "transfer_out", "production_in", "production_out", "return", "opening"]),
      warehouseId: z.number(),
      productId: z.number(),
      variantId: z.number().optional(),
      qty: z.string(),
      costPerUnit: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const totalCost = input.costPerUnit
        ? String(parseFloat(input.costPerUnit) * parseFloat(input.qty))
        : null;
      await db.insert(stockMovements).values({
        type: input.type,
        warehouseId: input.warehouseId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        qty: input.qty,
        costPerUnit: input.costPerUnit ?? null,
        totalCost,
        notes: input.notes ?? null,
        createdBy: ctx.user?.id ?? null,
      });
      // Update stock level
      await db.execute(sql`
        INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
        VALUES (${input.warehouseId}, ${input.productId}, ${input.variantId ?? null}, ${input.qty}, 0, 0)
        ON DUPLICATE KEY UPDATE qty = qty + ${input.qty}
      `);
      return { success: true };
    }),
});

// ─── Stock Adjustments ────────────────────────────────────────────────────────
const adjustmentsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: stockAdjustments.id,
        warehouseId: stockAdjustments.warehouseId,
        warehouseName: warehouses.name,
        reason: stockAdjustments.reason,
        status: stockAdjustments.status,
        notes: stockAdjustments.notes,
        createdAt: stockAdjustments.createdAt,
        confirmedAt: stockAdjustments.confirmedAt,
      })
      .from(stockAdjustments)
      .leftJoin(warehouses, eq(stockAdjustments.warehouseId, warehouses.id))
      .orderBy(desc(stockAdjustments.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [adj] = await db.select().from(stockAdjustments).where(eq(stockAdjustments.id, input.id)).limit(1);
      if (!adj) return null;
      const items = await db
        .select({
          id: stockAdjustmentItems.id,
          productId: stockAdjustmentItems.productId,
          productName: products.nameEn,
          variantId: stockAdjustmentItems.variantId,
          expectedQty: stockAdjustmentItems.expectedQty,
          actualQty: stockAdjustmentItems.actualQty,
          diff: stockAdjustmentItems.diff,
          notes: stockAdjustmentItems.notes,
        })
        .from(stockAdjustmentItems)
        .leftJoin(products, eq(stockAdjustmentItems.productId, products.id))
        .where(eq(stockAdjustmentItems.adjustmentId, input.id));
      return { ...adj, items };
    }),

  create: protectedProcedure
    .input(z.object({
      warehouseId: z.number(),
      reason: z.enum(["cycle_count", "damage", "expiry", "theft", "found", "opening_stock", "other"]),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        expectedQty: z.string(),
        actualQty: z.string(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(stockAdjustments).values({
        warehouseId: input.warehouseId,
        reason: input.reason,
        notes: input.notes ?? null,
        status: "draft",
        createdBy: ctx.user?.id ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const adjId = (idRow as any)[0].id as number;
      for (const item of input.items) {
        const diff = String(parseFloat(item.actualQty) - parseFloat(item.expectedQty));
        await db.insert(stockAdjustmentItems).values({
          adjustmentId: adjId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          expectedQty: item.expectedQty,
          actualQty: item.actualQty,
          diff,
          notes: item.notes ?? null,
        });
      }
      return { id: adjId };
    }),

  confirm: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [adj] = await db.select().from(stockAdjustments).where(eq(stockAdjustments.id, input.id)).limit(1);
      if (!adj || adj.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Adjustment not in draft status" });
      const items = await db.select().from(stockAdjustmentItems).where(eq(stockAdjustmentItems.adjustmentId, input.id));
      // Apply stock movements for each item
      for (const item of items) {
        const diff = parseFloat(item.diff);
        if (diff === 0) continue;
        await db.insert(stockMovements).values({
          type: "adjustment",
          warehouseId: adj.warehouseId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          qty: item.diff,
          refType: "adjustment",
          refId: adj.id,
          notes: adj.notes ?? null,
          createdBy: ctx.user?.id ?? null,
        });
        // Update stock level
        await db.execute(sql`
          INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
          VALUES (${adj.warehouseId}, ${item.productId}, ${item.variantId ?? null}, ${item.diff}, 0, 0)
          ON DUPLICATE KEY UPDATE qty = qty + ${item.diff}
        `);
      }
      await db.update(stockAdjustments).set({
        status: "confirmed",
        confirmedBy: ctx.user?.id ?? null,
        confirmedAt: new Date(),
      }).where(eq(stockAdjustments.id, input.id));
      return { success: true };
    }),
});

// ─── Stock Transfers ──────────────────────────────────────────────────────────
const transfersRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const fromWh = { id: warehouses.id, name: warehouses.name };
    return db
      .select({
        id: stockTransfers.id,
        fromWarehouseId: stockTransfers.fromWarehouseId,
        toWarehouseId: stockTransfers.toWarehouseId,
        status: stockTransfers.status,
        notes: stockTransfers.notes,
        createdAt: stockTransfers.createdAt,
        receivedAt: stockTransfers.receivedAt,
      })
      .from(stockTransfers)
      .orderBy(desc(stockTransfers.createdAt));
  }),

  create: protectedProcedure
    .input(z.object({
      fromWarehouseId: z.number(),
      toWarehouseId: z.number(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        qty: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(stockTransfers).values({
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        notes: input.notes ?? null,
        status: "draft",
        createdBy: ctx.user?.id ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const transferId = (idRow as any)[0].id as number;
      for (const item of input.items) {
        await db.insert(stockTransferItems).values({
          transferId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          qty: item.qty,
        });
      }
      return { id: transferId };
    }),

  receive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, input.id)).limit(1);
      if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db.select().from(stockTransferItems).where(eq(stockTransferItems.transferId, input.id));
      for (const item of items) {
        const negQty = String(-parseFloat(item.qty));
        // Deduct from source
        await db.insert(stockMovements).values({
          type: "transfer_out",
          warehouseId: transfer.fromWarehouseId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          qty: negQty,
          refType: "transfer",
          refId: transfer.id,
          createdBy: ctx.user?.id ?? null,
        });
        await db.execute(sql`
          INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
          VALUES (${transfer.fromWarehouseId}, ${item.productId}, ${item.variantId ?? null}, ${negQty}, 0, 0)
          ON DUPLICATE KEY UPDATE qty = qty + ${negQty}
        `);
        // Add to destination
        await db.insert(stockMovements).values({
          type: "transfer_in",
          warehouseId: transfer.toWarehouseId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          qty: item.qty,
          refType: "transfer",
          refId: transfer.id,
          createdBy: ctx.user?.id ?? null,
        });
        await db.execute(sql`
          INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
          VALUES (${transfer.toWarehouseId}, ${item.productId}, ${item.variantId ?? null}, ${item.qty}, 0, 0)
          ON DUPLICATE KEY UPDATE qty = qty + ${item.qty}
        `);
      }
      await db.update(stockTransfers).set({
        status: "received",
        receivedBy: ctx.user?.id ?? null,
        receivedAt: new Date(),
      }).where(eq(stockTransfers.id, input.id));
      return { success: true };
    }),
});

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────
const alertsRouter = router({
  checkAndNotify: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const lowItems = await db
      .select({
        productName: products.nameEn,
        productSku: products.sku,
        warehouseName: warehouses.name,
        qty: stockLevels.qty,
        reorderPoint: stockLevels.reorderPoint,
      })
      .from(stockLevels)
      .leftJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
      .leftJoin(products, eq(stockLevels.productId, products.id))
      .where(lt(stockLevels.qty, stockLevels.reorderPoint));
    if (lowItems.length === 0) return { sent: false, count: 0 };
    const lines = lowItems.map((item) =>
      `• ${item.productName ?? "Unknown"} (SKU: ${item.productSku ?? "N/A"}) @ ${item.warehouseName ?? "Main"}: ${Number(item.qty).toFixed(0)} units (reorder at ${Number(item.reorderPoint).toFixed(0)})`
    ).join("\n");
    await notifyOwner({
      title: `⚠️ Low Stock Alert — ${lowItems.length} product${lowItems.length > 1 ? "s" : ""} need restocking`,
      content: `The following products are below their reorder point:\n\n${lines}\n\nPlease review inventory and place purchase orders as needed.`,
    });
    return { sent: true, count: lowItems.length };
  }),
});

// ─── Inventory Batches / Lot Tracking ──────────────────────────────────────────────
const batchesRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      productId: z.number().optional(),
      expiringWithinDays: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const searchQ = input?.search ? `%${input.search}%` : null;
      const [rows] = await db.execute(sql`
        SELECT b.id, b.productId, b.warehouseId, b.batchNumber, b.lotNumber,
          b.expiryDate, b.manufactureDate, b.quantity, b.costPerUnit,
          b.isActive, b.notes, b.createdAt,
          p.nameEn as productNameEn, p.sku as productSku,
          w.name as warehouseName
        FROM inventory_batches b
        LEFT JOIN products p ON p.id = b.productId
        LEFT JOIN warehouses w ON w.id = b.warehouseId
        WHERE
          (${searchQ} IS NULL OR b.batchNumber LIKE ${searchQ} OR b.lotNumber LIKE ${searchQ} OR p.nameEn LIKE ${searchQ})
          AND (${input?.productId ?? null} IS NULL OR b.productId = ${input?.productId ?? null})
          AND (${input?.expiringWithinDays ?? null} IS NULL OR (
            b.expiryDate IS NOT NULL
            AND b.expiryDate <= DATE_ADD(CURDATE(), INTERVAL ${input?.expiringWithinDays ?? 30} DAY)
            AND b.expiryDate >= CURDATE()
          ))
        ORDER BY b.createdAt DESC
        LIMIT 200
      `);
      return (Array.isArray((rows as any)[0]) ? (rows as any)[0] : rows) as any[];
    }),

  create: protectedProcedure
    .input(z.object({
      productId: z.number(),
      warehouseId: z.number(),
      batchNumber: z.string(),
      lotNumber: z.string().optional(),
      expiryDate: z.string().optional(),
      manufactureDate: z.string().optional(),
      quantity: z.string(),
      costPerUnit: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`
        INSERT INTO inventory_batches (productId, warehouseId, batchNumber, lotNumber, expiryDate, manufactureDate, quantity, costPerUnit, notes, isActive)
        VALUES (
          ${input.productId}, ${input.warehouseId}, ${input.batchNumber},
          ${input.lotNumber ?? null}, ${input.expiryDate ?? null}, ${input.manufactureDate ?? null},
          ${input.quantity}, ${input.costPerUnit ?? null}, ${input.notes ?? null}, 1
        )
      `);
      const [r] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      return { id: (r as any)[0].id as number };
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(inventoryBatches).set({ isActive: false }).where(eq(inventoryBatches.id, input.id));
      return { success: true };
    }),
});

export const inventoryRouter = router({
  warehouses: warehouseRouter,
  stockLevels: stockLevelsRouter,
  movements: movementsRouter,
  adjustments: adjustmentsRouter,
  transfers: transfersRouter,
  alerts: alertsRouter,
  batches: batchesRouter,
});
