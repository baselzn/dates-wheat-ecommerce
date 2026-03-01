import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  products,
  productionOrderIngredients,
  productionOrders,
  purchaseOrderItems,
  purchaseOrders,
  rawMaterials,
  recipeIngredients,
  recipes,
  stockMovements,
  suppliers,
  warehouses,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

const unitEnum = z.enum(["kg", "g", "L", "mL", "pcs", "box", "bag", "roll"]);

function generateNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
const suppliersRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(suppliers).orderBy(suppliers.name);
  }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(128),
      code: z.string().max(32).optional(),
      contactName: z.string().max(128).optional(),
      phone: z.string().max(32).optional(),
      email: z.string().email().max(320).optional(),
      address: z.string().optional(),
      country: z.string().max(64).optional(),
      vatNumber: z.string().max(64).optional(),
      paymentTerms: z.string().max(128).optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const data = {
        name: input.name,
        code: input.code ?? null,
        contactName: input.contactName ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        country: input.country ?? "UAE",
        vatNumber: input.vatNumber ?? null,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
      };
      if (input.id) {
        await db.update(suppliers).set(data).where(eq(suppliers.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(suppliers).values(data);
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        return { id: (row as any)[0].id as number };
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(suppliers).where(eq(suppliers.id, input.id));
      return { success: true };
    }),
});

// ─── Raw Materials ────────────────────────────────────────────────────────────
const rawMaterialsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: rawMaterials.id,
        name: rawMaterials.name,
        nameAr: rawMaterials.nameAr,
        code: rawMaterials.code,
        unit: rawMaterials.unit,
        costPerUnit: rawMaterials.costPerUnit,
        stockQty: rawMaterials.stockQty,
        reorderPoint: rawMaterials.reorderPoint,
        supplierId: rawMaterials.supplierId,
        supplierName: suppliers.name,
        isActive: rawMaterials.isActive,
      })
      .from(rawMaterials)
      .leftJoin(suppliers, eq(rawMaterials.supplierId, suppliers.id))
      .orderBy(rawMaterials.name);
  }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(128),
      nameAr: z.string().max(128).optional(),
      code: z.string().max(64).optional(),
      unit: unitEnum,
      costPerUnit: z.string().default("0"),
      stockQty: z.string().default("0"),
      reorderPoint: z.string().default("0"),
      supplierId: z.number().optional(),
      warehouseId: z.number().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const data = {
        name: input.name,
        nameAr: input.nameAr ?? null,
        code: input.code ?? null,
        unit: input.unit,
        costPerUnit: input.costPerUnit,
        stockQty: input.stockQty,
        reorderPoint: input.reorderPoint,
        supplierId: input.supplierId ?? null,
        warehouseId: input.warehouseId ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
      };
      if (input.id) {
        await db.update(rawMaterials).set(data).where(eq(rawMaterials.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(rawMaterials).values(data);
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        return { id: (row as any)[0].id as number };
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(rawMaterials).where(eq(rawMaterials.id, input.id));
      return { success: true };
    }),
});

// ─── Recipes / BOMs ───────────────────────────────────────────────────────────
const recipesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: recipes.id,
        productId: recipes.productId,
        productName: products.nameEn,
        name: recipes.name,
        yieldQty: recipes.yieldQty,
        yieldUnit: recipes.yieldUnit,
        overheadCost: recipes.overheadCost,
        isActive: recipes.isActive,
        createdAt: recipes.createdAt,
      })
      .from(recipes)
      .leftJoin(products, eq(recipes.productId, products.id))
      .orderBy(recipes.name);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [recipe] = await db.select().from(recipes).where(eq(recipes.id, input.id)).limit(1);
      if (!recipe) return null;
      const ingredients = await db
        .select({
          id: recipeIngredients.id,
          rawMaterialId: recipeIngredients.rawMaterialId,
          rawMaterialName: rawMaterials.name,
          unit: recipeIngredients.unit,
          qty: recipeIngredients.qty,
          costPerUnit: rawMaterials.costPerUnit,
          notes: recipeIngredients.notes,
          sortOrder: recipeIngredients.sortOrder,
        })
        .from(recipeIngredients)
        .leftJoin(rawMaterials, eq(recipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(recipeIngredients.recipeId, input.id))
        .orderBy(recipeIngredients.sortOrder);
      return { ...recipe, ingredients };
    }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      productId: z.number(),
      name: z.string().min(1).max(128),
      yieldQty: z.string(),
      yieldUnit: z.string().default("pcs"),
      overheadCost: z.string().default("0"),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
      ingredients: z.array(z.object({
        id: z.number().optional(),
        rawMaterialId: z.number(),
        qty: z.string(),
        unit: unitEnum,
        notes: z.string().optional(),
        sortOrder: z.number().default(0),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let recipeId = input.id;
      if (recipeId) {
        await db.update(recipes).set({
          productId: input.productId,
          name: input.name,
          yieldQty: input.yieldQty,
          yieldUnit: input.yieldUnit,
          overheadCost: input.overheadCost,
          notes: input.notes ?? null,
          isActive: input.isActive ?? true,
        }).where(eq(recipes.id, recipeId));
        // Delete existing ingredients and re-insert
        await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
      } else {
        await db.insert(recipes).values({
          productId: input.productId,
          name: input.name,
          yieldQty: input.yieldQty,
          yieldUnit: input.yieldUnit,
          overheadCost: input.overheadCost,
          notes: input.notes ?? null,
          isActive: input.isActive ?? true,
        });
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        recipeId = (row as any)[0].id as number;
      }
      for (let i = 0; i < input.ingredients.length; i++) {
        const ing = input.ingredients[i];
        await db.insert(recipeIngredients).values({
          recipeId: recipeId!,
          rawMaterialId: ing.rawMaterialId,
          qty: ing.qty,
          unit: ing.unit,
          notes: ing.notes ?? null,
          sortOrder: ing.sortOrder ?? i,
        });
      }
      return { id: recipeId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(recipes).where(eq(recipes.id, input.id));
      return { success: true };
    }),
});

// ─── Production Orders ────────────────────────────────────────────────────────
const productionRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: productionOrders.id,
        orderNumber: productionOrders.orderNumber,
        recipeId: productionOrders.recipeId,
        recipeName: recipes.name,
        productId: productionOrders.productId,
        productName: products.nameEn,
        plannedQty: productionOrders.plannedQty,
        actualQty: productionOrders.actualQty,
        batchNumber: productionOrders.batchNumber,
        status: productionOrders.status,
        scheduledDate: productionOrders.scheduledDate,
        completedAt: productionOrders.completedAt,
        totalCost: productionOrders.totalCost,
        costPerUnit: productionOrders.costPerUnit,
        createdAt: productionOrders.createdAt,
      })
      .from(productionOrders)
      .leftJoin(recipes, eq(productionOrders.recipeId, recipes.id))
      .leftJoin(products, eq(productionOrders.productId, products.id))
      .orderBy(desc(productionOrders.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, input.id)).limit(1);
      if (!order) return null;
      const ingredients = await db
        .select({
          id: productionOrderIngredients.id,
          rawMaterialId: productionOrderIngredients.rawMaterialId,
          rawMaterialName: rawMaterials.name,
          unit: productionOrderIngredients.unit,
          plannedQty: productionOrderIngredients.plannedQty,
          actualQty: productionOrderIngredients.actualQty,
          costPerUnit: productionOrderIngredients.costPerUnit,
          totalCost: productionOrderIngredients.totalCost,
        })
        .from(productionOrderIngredients)
        .leftJoin(rawMaterials, eq(productionOrderIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(productionOrderIngredients.productionOrderId, input.id));
      return { ...order, ingredients };
    }),

  create: protectedProcedure
    .input(z.object({
      recipeId: z.number(),
      productId: z.number(),
      warehouseId: z.number().optional(),
      plannedQty: z.string(),
      batchNumber: z.string().optional(),
      scheduledDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Load recipe ingredients
      const ingredients = await db
        .select({
          rawMaterialId: recipeIngredients.rawMaterialId,
          qty: recipeIngredients.qty,
          unit: recipeIngredients.unit,
          costPerUnit: rawMaterials.costPerUnit,
        })
        .from(recipeIngredients)
        .leftJoin(rawMaterials, eq(recipeIngredients.rawMaterialId, rawMaterials.id))
        .where(eq(recipeIngredients.recipeId, input.recipeId));
      const [recipe] = await db.select().from(recipes).where(eq(recipes.id, input.recipeId)).limit(1);
      if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
      const scale = parseFloat(input.plannedQty) / parseFloat(recipe.yieldQty);
      const orderNumber = generateNumber("PRD");
      await db.insert(productionOrders).values({
        orderNumber,
        recipeId: input.recipeId,
        productId: input.productId,
        warehouseId: input.warehouseId ?? null,
        plannedQty: input.plannedQty,
        batchNumber: input.batchNumber ?? null,
        status: "draft",
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        notes: input.notes ?? null,
        createdBy: ctx.user?.id ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const orderId = (idRow as any)[0].id as number;
      // Insert scaled ingredients
      for (const ing of ingredients) {
        const scaledQty = String(parseFloat(ing.qty) * scale);
        const cost = parseFloat(ing.costPerUnit ?? "0");
        await db.insert(productionOrderIngredients).values({
          productionOrderId: orderId,
          rawMaterialId: ing.rawMaterialId,
          plannedQty: scaledQty,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit ?? "0",
          totalCost: String(cost * parseFloat(scaledQty)),
        });
      }
      return { id: orderId, orderNumber };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "in_progress", "completed", "cancelled"]),
      actualQty: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, input.id)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "in_progress") {
        updateData.startedAt = new Date();
      }
      if (input.status === "completed") {
        updateData.completedAt = new Date();
        updateData.actualQty = input.actualQty ?? order.plannedQty;
        // Calculate total cost
        const ingredients = await db.select().from(productionOrderIngredients)
          .where(eq(productionOrderIngredients.productionOrderId, input.id));
        const [recipe] = await db.select().from(recipes).where(eq(recipes.id, order.recipeId)).limit(1);
        let materialCost = 0;
        for (const ing of ingredients) {
          materialCost += parseFloat(ing.totalCost ?? "0");
        }
        const overheadCost = parseFloat(recipe?.overheadCost ?? "0");
        const totalCost = materialCost + overheadCost;
        const actualQty = parseFloat(input.actualQty ?? order.plannedQty);
        const costPerUnit = actualQty > 0 ? totalCost / actualQty : 0;
        updateData.totalMaterialCost = String(materialCost);
        updateData.totalOverheadCost = String(overheadCost);
        updateData.totalCost = String(totalCost);
        updateData.costPerUnit = String(costPerUnit);
        // Deduct raw materials from stock
        for (const ing of ingredients) {
          const negQty = String(-parseFloat(ing.plannedQty));
          await db.execute(sql`
            UPDATE raw_materials SET stockQty = stockQty + ${negQty} WHERE id = ${ing.rawMaterialId}
          `);
          if (order.warehouseId) {
            await db.insert(stockMovements).values({
              type: "production_out",
              warehouseId: order.warehouseId,
              productId: order.productId,
              qty: negQty,
              refType: "production_order",
              refId: order.id,
              createdBy: ctx.user?.id ?? null,
            });
          }
        }
        // Add finished goods to stock
        if (order.warehouseId) {
          await db.insert(stockMovements).values({
            type: "production_in",
            warehouseId: order.warehouseId,
            productId: order.productId,
            qty: String(actualQty),
            costPerUnit: String(costPerUnit),
            totalCost: String(totalCost),
            refType: "production_order",
            refId: order.id,
            createdBy: ctx.user?.id ?? null,
          });
          await db.execute(sql`
            INSERT INTO stock_levels (warehouseId, productId, variantId, qty, reservedQty, reorderPoint)
            VALUES (${order.warehouseId}, ${order.productId}, NULL, ${actualQty}, 0, 0)
            ON DUPLICATE KEY UPDATE qty = qty + ${actualQty}
          `);
          // Update product stockQty
          await db.execute(sql`
            UPDATE products SET stockQty = stockQty + ${actualQty} WHERE id = ${order.productId}
          `);
        }
      }
      await db.update(productionOrders).set(updateData as any).where(eq(productionOrders.id, input.id));
      return { success: true };
    }),
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────
const purchaseOrdersRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        expectedDate: purchaseOrders.expectedDate,
        receivedAt: purchaseOrders.receivedAt,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(purchaseOrders.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id)).limit(1);
      if (!order) return null;
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          rawMaterialId: purchaseOrderItems.rawMaterialId,
          rawMaterialName: rawMaterials.name,
          unit: rawMaterials.unit,
          orderedQty: purchaseOrderItems.orderedQty,
          receivedQty: purchaseOrderItems.receivedQty,
          unitCost: purchaseOrderItems.unitCost,
          totalCost: purchaseOrderItems.totalCost,
        })
        .from(purchaseOrderItems)
        .leftJoin(rawMaterials, eq(purchaseOrderItems.rawMaterialId, rawMaterials.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));
      return { ...order, items };
    }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      warehouseId: z.number().optional(),
      expectedDate: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        rawMaterialId: z.number(),
        orderedQty: z.string(),
        unitCost: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let subtotal = 0;
      for (const item of input.items) {
        subtotal += parseFloat(item.orderedQty) * parseFloat(item.unitCost);
      }
      const vatAmount = subtotal * 0.05;
      const totalAmount = subtotal + vatAmount;
      const orderNumber = generateNumber("PO");
      await db.insert(purchaseOrders).values({
        orderNumber,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId ?? null,
        status: "draft",
        subtotal: String(subtotal),
        vatAmount: String(vatAmount),
        totalAmount: String(totalAmount),
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes ?? null,
        createdBy: ctx.user?.id ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const poId = (idRow as any)[0].id as number;
      for (const item of input.items) {
        const totalCost = String(parseFloat(item.orderedQty) * parseFloat(item.unitCost));
        await db.insert(purchaseOrderItems).values({
          purchaseOrderId: poId,
          rawMaterialId: item.rawMaterialId,
          orderedQty: item.orderedQty,
          receivedQty: "0",
          unitCost: item.unitCost,
          totalCost,
        });
      }
      return { id: poId, orderNumber };
    }),

  receive: protectedProcedure
    .input(z.object({
      id: z.number(),
      items: z.array(z.object({
        id: z.number(),
        receivedQty: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const item of input.items) {
        await db.update(purchaseOrderItems).set({ receivedQty: item.receivedQty })
          .where(eq(purchaseOrderItems.id, item.id));
        // Update raw material stock
        await db.execute(sql`
          UPDATE raw_materials SET stockQty = stockQty + ${item.receivedQty} WHERE id = (
            SELECT rawMaterialId FROM purchase_order_items WHERE id = ${item.id}
          )
        `);
      }
      await db.update(purchaseOrders).set({
        status: "received",
        receivedAt: new Date(),
      }).where(eq(purchaseOrders.id, input.id));
      return { success: true };
    }),
});

export const manufacturingRouter = router({
  suppliers: suppliersRouter,
  rawMaterials: rawMaterialsRouter,
  recipes: recipesRouter,
  production: productionRouter,
  purchaseOrders: purchaseOrdersRouter,
});
