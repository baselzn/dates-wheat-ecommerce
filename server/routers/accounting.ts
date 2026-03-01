import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  accounts,
  fiscalYears,
  journalEntries,
  journalLines,
  taxRates,
  users,
} from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

function generateEntryNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `JE-${ts}${rand}`;
}

// ─── Chart of Accounts ────────────────────────────────────────────────────────
const accountsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(accounts).orderBy(accounts.code);
  }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      code: z.string().min(1).max(16),
      name: z.string().min(1).max(128),
      nameAr: z.string().max(128).optional(),
      type: z.enum(["asset", "liability", "equity", "revenue", "expense", "cogs"]),
      subtype: z.string().max(64).optional(),
      parentId: z.number().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const data = {
        code: input.code,
        name: input.name,
        nameAr: input.nameAr ?? null,
        type: input.type,
        subtype: input.subtype ?? null,
        parentId: input.parentId ?? null,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      };
      if (input.id) {
        await db.update(accounts).set(data).where(eq(accounts.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(accounts).values({ ...data, isSystem: false });
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        return { id: (row as any)[0].id as number };
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, input.id)).limit(1);
      if (acc?.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system accounts" });
      await db.delete(accounts).where(eq(accounts.id, input.id));
      return { success: true };
    }),

  seed: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const existing = await db.select().from(accounts).limit(1);
    if (existing.length > 0) return { message: "Chart of accounts already seeded" };
    const defaultAccounts = [
      // Assets
      { code: "1000", name: "Cash and Cash Equivalents", nameAr: "النقد وما يعادله", type: "asset" as const, subtype: "current_asset", isSystem: true },
      { code: "1010", name: "Cash on Hand", nameAr: "النقد في الصندوق", type: "asset" as const, subtype: "current_asset", isSystem: true },
      { code: "1020", name: "Bank Account", nameAr: "الحساب البنكي", type: "asset" as const, subtype: "current_asset", isSystem: true },
      { code: "1100", name: "Accounts Receivable", nameAr: "حسابات القبض", type: "asset" as const, subtype: "current_asset", isSystem: true },
      { code: "1200", name: "Inventory", nameAr: "المخزون", type: "asset" as const, subtype: "current_asset", isSystem: true },
      { code: "1210", name: "Raw Materials Inventory", nameAr: "مخزون المواد الخام", type: "asset" as const, subtype: "current_asset", isSystem: false },
      { code: "1220", name: "Finished Goods Inventory", nameAr: "مخزون البضاعة التامة", type: "asset" as const, subtype: "current_asset", isSystem: false },
      { code: "1300", name: "Prepaid Expenses", nameAr: "المصروفات المدفوعة مقدماً", type: "asset" as const, subtype: "current_asset", isSystem: false },
      { code: "1500", name: "Fixed Assets", nameAr: "الأصول الثابتة", type: "asset" as const, subtype: "fixed_asset", isSystem: false },
      { code: "1510", name: "Equipment", nameAr: "المعدات", type: "asset" as const, subtype: "fixed_asset", isSystem: false },
      // Liabilities
      { code: "2000", name: "Accounts Payable", nameAr: "حسابات الدفع", type: "liability" as const, subtype: "current_liability", isSystem: true },
      { code: "2100", name: "VAT Payable", nameAr: "ضريبة القيمة المضافة المستحقة", type: "liability" as const, subtype: "current_liability", isSystem: true },
      { code: "2110", name: "VAT Collected (Output)", nameAr: "ضريبة القيمة المضافة المحصلة", type: "liability" as const, subtype: "current_liability", isSystem: true },
      { code: "2120", name: "VAT Paid (Input)", nameAr: "ضريبة القيمة المضافة المدفوعة", type: "asset" as const, subtype: "current_asset", isSystem: true },
      { code: "2200", name: "Accrued Expenses", nameAr: "المصروفات المستحقة", type: "liability" as const, subtype: "current_liability", isSystem: false },
      { code: "2500", name: "Long-term Loans", nameAr: "القروض طويلة الأجل", type: "liability" as const, subtype: "long_term_liability", isSystem: false },
      // Equity
      { code: "3000", name: "Owner's Equity", nameAr: "حقوق الملكية", type: "equity" as const, subtype: "equity", isSystem: true },
      { code: "3100", name: "Retained Earnings", nameAr: "الأرباح المحتجزة", type: "equity" as const, subtype: "equity", isSystem: true },
      { code: "3200", name: "Current Year Profit/Loss", nameAr: "ربح/خسارة السنة الحالية", type: "equity" as const, subtype: "equity", isSystem: true },
      // Revenue
      { code: "4000", name: "Sales Revenue", nameAr: "إيرادات المبيعات", type: "revenue" as const, subtype: "operating", isSystem: true },
      { code: "4010", name: "E-Commerce Sales", nameAr: "مبيعات التجارة الإلكترونية", type: "revenue" as const, subtype: "operating", isSystem: true },
      { code: "4020", name: "POS Sales", nameAr: "مبيعات نقطة البيع", type: "revenue" as const, subtype: "operating", isSystem: true },
      { code: "4100", name: "Shipping Revenue", nameAr: "إيرادات الشحن", type: "revenue" as const, subtype: "operating", isSystem: false },
      { code: "4900", name: "Other Income", nameAr: "إيرادات أخرى", type: "revenue" as const, subtype: "other", isSystem: false },
      // COGS
      { code: "5000", name: "Cost of Goods Sold", nameAr: "تكلفة البضاعة المباعة", type: "cogs" as const, subtype: "cogs", isSystem: true },
      { code: "5010", name: "Raw Material Costs", nameAr: "تكاليف المواد الخام", type: "cogs" as const, subtype: "cogs", isSystem: false },
      { code: "5020", name: "Manufacturing Overhead", nameAr: "التكاليف الصناعية العامة", type: "cogs" as const, subtype: "cogs", isSystem: false },
      // Expenses
      { code: "6000", name: "Operating Expenses", nameAr: "المصروفات التشغيلية", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6100", name: "Salaries and Wages", nameAr: "الرواتب والأجور", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6200", name: "Rent Expense", nameAr: "مصروف الإيجار", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6300", name: "Utilities", nameAr: "المرافق", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6400", name: "Marketing and Advertising", nameAr: "التسويق والإعلان", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6500", name: "Shipping and Delivery", nameAr: "الشحن والتوصيل", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6600", name: "Bank Charges", nameAr: "رسوم بنكية", type: "expense" as const, subtype: "operating", isSystem: false },
      { code: "6900", name: "Miscellaneous Expenses", nameAr: "مصروفات متنوعة", type: "expense" as const, subtype: "other", isSystem: false },
    ];
    for (const acc of defaultAccounts) {
      await db.insert(accounts).values({ ...acc, balance: "0" });
    }
    return { message: `Seeded ${defaultAccounts.length} accounts` };
  }),
});

// ─── Journal Entries ──────────────────────────────────────────────────────────
const journalRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "posted", "reversed"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input?.status) conditions.push(eq(journalEntries.status, input.status));
      if (input?.from) conditions.push(gte(journalEntries.date, new Date(input.from)));
      if (input?.to) conditions.push(lte(journalEntries.date, new Date(input.to)));
      const query = db
        .select({
          id: journalEntries.id,
          entryNumber: journalEntries.entryNumber,
          date: journalEntries.date,
          description: journalEntries.description,
          refType: journalEntries.refType,
          refId: journalEntries.refId,
          status: journalEntries.status,
          createdAt: journalEntries.createdAt,
          postedAt: journalEntries.postedAt,
          createdByName: users.name,
        })
        .from(journalEntries)
        .leftJoin(users, eq(journalEntries.createdBy, users.id))
        .orderBy(desc(journalEntries.date))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      if (conditions.length > 0) return query.where(and(...conditions));
      return query;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, input.id)).limit(1);
      if (!entry) return null;
      const lines = await db
        .select({
          id: journalLines.id,
          accountId: journalLines.accountId,
          accountCode: accounts.code,
          accountName: accounts.name,
          debit: journalLines.debit,
          credit: journalLines.credit,
          description: journalLines.description,
        })
        .from(journalLines)
        .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
        .where(eq(journalLines.journalEntryId, input.id));
      return { ...entry, lines };
    }),

  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      description: z.string().min(1).max(512),
      refType: z.string().optional(),
      refId: z.number().optional(),
      notes: z.string().optional(),
      lines: z.array(z.object({
        accountId: z.number(),
        debit: z.string().default("0"),
        credit: z.string().default("0"),
        description: z.string().max(256).optional(),
      })).min(2),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Validate debits == credits
      const totalDebit = input.lines.reduce((sum, l) => sum + parseFloat(l.debit), 0);
      const totalCredit = input.lines.reduce((sum, l) => sum + parseFloat(l.credit), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})` });
      }
      const entryNumber = generateEntryNumber();
      await db.insert(journalEntries).values({
        entryNumber,
        date: new Date(input.date),
        description: input.description,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        status: "draft",
        notes: input.notes ?? null,
        createdBy: ctx.user?.id ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const entryId = (idRow as any)[0].id as number;
      for (const line of input.lines) {
        await db.insert(journalLines).values({
          journalEntryId: entryId,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? null,
        });
      }
      return { id: entryId, entryNumber };
    }),

  post: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, input.id)).limit(1);
      if (!entry || entry.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Entry is not in draft status" });
      const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, input.id));
      // Update account balances
      for (const line of lines) {
        const net = parseFloat(line.debit) - parseFloat(line.credit);
        await db.execute(sql`UPDATE accounts SET balance = balance + ${net} WHERE id = ${line.accountId}`);
      }
      await db.update(journalEntries).set({ status: "posted", postedAt: new Date() }).where(eq(journalEntries.id, input.id));
      return { success: true };
    }),

  reverse: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, input.id)).limit(1);
      if (!entry || entry.status !== "posted") throw new TRPCError({ code: "BAD_REQUEST", message: "Only posted entries can be reversed" });
      const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, input.id));
      // Create reversal entry
      const reversalNumber = generateEntryNumber();
      await db.insert(journalEntries).values({
        entryNumber: reversalNumber,
        date: new Date(),
        description: `Reversal of ${entry.entryNumber}: ${input.reason ?? ""}`,
        refType: "reversal",
        refId: entry.id,
        status: "draft",
        createdBy: ctx.user?.id ?? null,
      });
      const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      const reversalId = (idRow as any)[0].id as number;
      for (const line of lines) {
        await db.insert(journalLines).values({
          journalEntryId: reversalId,
          accountId: line.accountId,
          debit: line.credit, // swap
          credit: line.debit,
          description: `Reversal: ${line.description ?? ""}`,
        });
      }
      await db.update(journalEntries).set({ status: "reversed", reversedBy: reversalId }).where(eq(journalEntries.id, input.id));
      return { id: reversalId, entryNumber: reversalNumber };
    }),
});

// ─── Reports ──────────────────────────────────────────────────────────────────
const reportsRouter = router({
  profitAndLoss: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { revenue: [], cogs: [], expenses: [], totalRevenue: 0, totalCogs: 0, totalExpenses: 0, grossProfit: 0, netProfit: 0 };
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      // Get posted journal lines in date range
      const rows = await db.execute(sql`
        SELECT
          a.type,
          a.code,
          a.name,
          SUM(jl.debit - jl.credit) as net
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journalEntryId
        JOIN accounts a ON a.id = jl.accountId
        WHERE je.status = 'posted'
          AND je.date >= ${fromDate}
          AND je.date <= ${toDate}
          AND a.type IN ('revenue', 'cogs', 'expense')
        GROUP BY a.id, a.type, a.code, a.name
        ORDER BY a.code
      `);
      const data = ((rows[0] as unknown) as any[]) ?? [];
      const revenue = data.filter((r: any) => r.type === "revenue").map((r: any) => ({
        code: r.code, name: r.name, amount: -parseFloat(r.net ?? "0"),
      }));
      const cogs = data.filter((r: any) => r.type === "cogs").map((r: any) => ({
        code: r.code, name: r.name, amount: parseFloat(r.net ?? "0"),
      }));
      const expenses = data.filter((r: any) => r.type === "expense").map((r: any) => ({
        code: r.code, name: r.name, amount: parseFloat(r.net ?? "0"),
      }));
      const totalRevenue = revenue.reduce((s: number, r: any) => s + r.amount, 0);
      const totalCogs = cogs.reduce((s: number, r: any) => s + r.amount, 0);
      const totalExpenses = expenses.reduce((s: number, r: any) => s + r.amount, 0);
      const grossProfit = totalRevenue - totalCogs;
      const netProfit = grossProfit - totalExpenses;
      return { revenue, cogs, expenses, totalRevenue, totalCogs, totalExpenses, grossProfit, netProfit };
    }),

  balanceSheet: protectedProcedure
    .input(z.object({ asOf: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
      const asOf = new Date(input.asOf);
      const rows = await db.execute(sql`
        SELECT
          a.type,
          a.code,
          a.name,
          SUM(jl.debit - jl.credit) as net
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journalEntryId
        JOIN accounts a ON a.id = jl.accountId
        WHERE je.status = 'posted'
          AND je.date <= ${asOf}
          AND a.type IN ('asset', 'liability', 'equity')
        GROUP BY a.id, a.type, a.code, a.name
        ORDER BY a.code
      `);
      const data = ((rows[0] as unknown) as any[]) ?? [];
      const assets = data.filter((r: any) => r.type === "asset").map((r: any) => ({
        code: r.code, name: r.name, amount: parseFloat(r.net ?? "0"),
      }));
      const liabilities = data.filter((r: any) => r.type === "liability").map((r: any) => ({
        code: r.code, name: r.name, amount: -parseFloat(r.net ?? "0"),
      }));
      const equity = data.filter((r: any) => r.type === "equity").map((r: any) => ({
        code: r.code, name: r.name, amount: -parseFloat(r.net ?? "0"),
      }));
      const totalAssets = assets.reduce((s: number, r: any) => s + r.amount, 0);
      const totalLiabilities = liabilities.reduce((s: number, r: any) => s + r.amount, 0);
      const totalEquity = equity.reduce((s: number, r: any) => s + r.amount, 0);
      return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    }),

  vatReport: protectedProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { outputVat: 0, inputVat: 0, netVat: 0 };
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      const rows = await db.execute(sql`
        SELECT
          a.code,
          SUM(jl.debit - jl.credit) as net
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journalEntryId
        JOIN accounts a ON a.id = jl.accountId
        WHERE je.status = 'posted'
          AND je.date >= ${fromDate}
          AND je.date <= ${toDate}
          AND a.code IN ('2110', '2120')
        GROUP BY a.code
      `);
      const data = ((rows[0] as unknown) as any[]) ?? [];
      const outputRow = data.find((r: any) => r.code === "2110");
      const inputRow = data.find((r: any) => r.code === "2120");
      const outputVat = -parseFloat(outputRow?.net ?? "0");
      const inputVat = parseFloat(inputRow?.net ?? "0");
      const netVat = outputVat - inputVat;
      return { outputVat, inputVat, netVat };
    }),
});

// ─── Tax Rates ────────────────────────────────────────────────────────────────
const taxRatesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(taxRates).orderBy(taxRates.name);
  }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(64),
      rate: z.string(),
      type: z.enum(["vat", "withholding", "other"]).default("vat"),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id) {
        await db.update(taxRates).set({
          name: input.name,
          rate: input.rate,
          type: input.type,
          isDefault: input.isDefault ?? false,
          isActive: input.isActive ?? true,
        }).where(eq(taxRates.id, input.id));
        return { id: input.id };
      } else {
        await db.insert(taxRates).values({
          name: input.name,
          rate: input.rate,
          type: input.type,
          isDefault: input.isDefault ?? false,
          isActive: input.isActive ?? true,
        });
        const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        return { id: (row as any)[0].id as number };
      }
    }),
});

// ─── Fiscal Years ─────────────────────────────────────────────────────────────
const fiscalYearsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(fiscalYears).orderBy(desc(fiscalYears.startDate));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(fiscalYears).values({
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        isClosed: false,
      });
      const [row] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      return { id: (row as any)[0].id as number };
    }),
});

export const accountingRouter = router({
  accounts: accountsRouter,
  journal: journalRouter,
  reports: reportsRouter,
  taxRates: taxRatesRouter,
  fiscalYears: fiscalYearsRouter,
});
