/**
 * Auto-posting helpers for e-commerce and POS orders.
 * Called after an order is confirmed/paid to create a journal entry automatically.
 *
 * Chart of Accounts assumed (system accounts, code-based lookup):
 *   1100 — Accounts Receivable (or Cash for COD/POS)
 *   1000 — Cash / Bank
 *   4000 — Sales Revenue
 *   2200 — VAT Payable
 *   5000 — Cost of Goods Sold (optional, if COGS tracking is enabled)
 */

import { eq, sql } from "drizzle-orm";
import { accounts, journalEntries, journalLines } from "../drizzle/schema";
import { getDb } from "./db";

function generateEntryNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `JE-${ts}${rand}`;
}

/** Find an account by its code. Returns null if not found. */
async function findAccount(db: Awaited<ReturnType<typeof getDb>>, code: string) {
  if (!db) return null;
  const [row] = await db.select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.code, code))
    .limit(1);
  return row ?? null;
}

/** Insert a journal entry with lines and immediately post it. */
async function insertAndPost(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    description: string;
    refType: string;
    refId: number;
    date: Date;
    lines: { accountId: number; debit: string; credit: string; description?: string }[];
  }
) {
  if (!db) return;
  const entryNumber = generateEntryNumber();
  await db.insert(journalEntries).values({
    entryNumber,
    date: params.date,
    description: params.description,
    refType: params.refType,
    refId: params.refId,
    status: "posted",
    postedAt: new Date(),
  });
  const [idRow] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
  const entryId = (idRow as any)[0].id as number;
  for (const line of params.lines) {
    await db.insert(journalLines).values({
      journalEntryId: entryId,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      description: line.description ?? null,
    });
    // Update account balance (debit increases asset/expense, credit increases liability/revenue)
    const net = parseFloat(line.debit) - parseFloat(line.credit);
    await db.execute(sql`UPDATE accounts SET balance = balance + ${net} WHERE id = ${line.accountId}`);
  }
  return entryId;
}

/**
 * Auto-post a journal entry for an e-commerce order.
 * Called when paymentStatus transitions to "paid".
 *
 * Entry:
 *   DR  Accounts Receivable (1100) or Cash (1000 for COD)   = total
 *   CR  Sales Revenue (4000)                                 = subtotal
 *   CR  VAT Payable (2200)                                   = vatAmount
 *   CR  Shipping Revenue (4100) if shippingAmount > 0        = shippingAmount
 *   DR  Discount Expense (5100) if discountAmount > 0        = discountAmount (net from AR)
 */
export async function autoPostOrderJournal(order: {
  id: number;
  orderNumber: string;
  paymentMethod: string;
  subtotal: string;
  vatAmount: string;
  shippingAmount: string;
  discountAmount: string;
  total: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const subtotal = parseFloat(order.subtotal);
  const vat = parseFloat(order.vatAmount);
  const shipping = parseFloat(order.shippingAmount);
  const discount = parseFloat(order.discountAmount);
  const total = parseFloat(order.total);

  // Look up required accounts
  const isCod = order.paymentMethod === "cod";
  const debitAccount = isCod
    ? await findAccount(db, "1000") // Cash
    : await findAccount(db, "1100"); // Accounts Receivable
  const salesAccount = await findAccount(db, "4000");
  const vatAccount = await findAccount(db, "2200");
  const shippingAccount = await findAccount(db, "4100");
  const discountAccount = await findAccount(db, "5100");

  // If core accounts are missing, skip silently (accounts not set up yet)
  if (!debitAccount || !salesAccount || !vatAccount) {
    console.warn(`[Accounting] Skipping auto-post for order ${order.orderNumber}: required accounts (1100/1000, 4000, 2200) not found.`);
    return;
  }

  const lines: { accountId: number; debit: string; credit: string; description?: string }[] = [];

  // DR: Cash or AR for the full order total
  lines.push({
    accountId: debitAccount.id,
    debit: total.toFixed(2),
    credit: "0.00",
    description: `Order ${order.orderNumber}`,
  });

  // CR: Sales Revenue (subtotal minus discount)
  const netSales = (subtotal - discount).toFixed(2);
  lines.push({
    accountId: salesAccount.id,
    debit: "0.00",
    credit: netSales,
    description: `Sales — Order ${order.orderNumber}`,
  });

  // CR: VAT Payable
  if (vat > 0) {
    lines.push({
      accountId: vatAccount.id,
      debit: "0.00",
      credit: vat.toFixed(2),
      description: `VAT 5% — Order ${order.orderNumber}`,
    });
  }

  // CR: Shipping Revenue (if applicable)
  if (shipping > 0 && shippingAccount) {
    lines.push({
      accountId: shippingAccount.id,
      debit: "0.00",
      credit: shipping.toFixed(2),
      description: `Shipping — Order ${order.orderNumber}`,
    });
  } else if (shipping > 0 && !shippingAccount) {
    // Fallback: fold into sales revenue
    const existingSales = lines.find((l) => l.accountId === salesAccount.id);
    if (existingSales) {
      existingSales.credit = (parseFloat(existingSales.credit) + shipping).toFixed(2);
    }
  }

  // Validate debit == credit
  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.warn(`[Accounting] Skipping auto-post for order ${order.orderNumber}: debit/credit mismatch (${totalDebit.toFixed(2)} vs ${totalCredit.toFixed(2)})`);
    return;
  }

  await insertAndPost(db, {
    description: `E-Commerce Order ${order.orderNumber}`,
    refType: "order",
    refId: order.id,
    date: new Date(),
    lines,
  });
}

/**
 * Auto-post a journal entry for a POS sale.
 * Called when a POS session order is completed.
 *
 * Entry:
 *   DR  Cash (1000)              = totalAmount
 *   CR  Sales Revenue (4000)     = subtotal
 *   CR  VAT Payable (2200)       = taxAmount
 */
export async function autoPostPOSJournal(posOrder: {
  id: number;
  orderNumber: string;
  subtotal: string;
  taxAmount: string;
  total: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const subtotal = parseFloat(posOrder.subtotal);
  const tax = parseFloat(posOrder.taxAmount);
  const total = parseFloat(posOrder.total);

  const cashAccount = await findAccount(db, "1000");
  const salesAccount = await findAccount(db, "4000");
  const vatAccount = await findAccount(db, "2200");

  if (!cashAccount || !salesAccount || !vatAccount) {
    console.warn(`[Accounting] Skipping auto-post for POS order ${posOrder.orderNumber}: required accounts not found.`);
    return;
  }

  const lines: { accountId: number; debit: string; credit: string; description?: string }[] = [
    { accountId: cashAccount.id, debit: total.toFixed(2), credit: "0.00", description: `POS ${posOrder.orderNumber}` },
    { accountId: salesAccount.id, debit: "0.00", credit: subtotal.toFixed(2), description: `Sales — POS ${posOrder.orderNumber}` },
  ];
  if (tax > 0) {
    lines.push({ accountId: vatAccount.id, debit: "0.00", credit: tax.toFixed(2), description: `VAT — POS ${posOrder.orderNumber}` });
  }

  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.warn(`[Accounting] Skipping auto-post for POS order ${posOrder.orderNumber}: debit/credit mismatch`);
    return;
  }

  await insertAndPost(db, {
    description: `POS Sale ${posOrder.orderNumber}`,
    refType: "pos_order",
    refId: posOrder.id,
    date: new Date(),
    lines,
  });
}
