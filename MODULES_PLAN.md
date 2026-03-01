# Dates & Wheat — Business Modules Architecture Plan

## Overview

Four integrated business modules built on top of the existing e-commerce platform:

| Module | Purpose | Key Entities |
|---|---|---|
| **Inventory** | Track stock across warehouses, movements, adjustments | Warehouses, Stock Ledger, Adjustments, Transfers |
| **POS** | In-store cashier terminal with sessions and receipts | POS Sessions, POS Orders, Payment Methods |
| **Manufacturing** | Recipes (BOMs), production orders, cost tracking | Recipes, BOM Lines, Production Orders, Batches |
| **Accounting** | Double-entry bookkeeping, P&L, balance sheet | Chart of Accounts, Journal Entries, Ledger |

---

## Module 1: Inventory Management

### Data Model
```
warehouses            — id, name, location, isDefault, isActive
stock_levels          — warehouseId, productId, variantId, qty, reservedQty, updatedAt
stock_movements       — id, type(in/out/transfer/adjustment/production/sale/return), 
                        warehouseId, productId, variantId, qty, refType, refId, 
                        notes, costPerUnit, createdBy, createdAt
stock_adjustments     — id, warehouseId, reason, notes, status(draft/confirmed), 
                        confirmedBy, createdAt
stock_adjustment_items — adjustmentId, productId, variantId, expectedQty, actualQty, diff
```

### Features
- Multi-warehouse stock levels dashboard
- Stock movement history (filterable by product/warehouse/type)
- Manual stock adjustments (draft → confirm workflow)
- Inter-warehouse stock transfers
- Low stock alerts (reorder point per product)
- Stock valuation report (FIFO cost)
- Auto-deduct on order placement and POS sale
- Auto-increment on production order completion

---

## Module 2: POS (Point of Sale)

### Data Model
```
pos_sessions          — id, cashierId, warehouseId, openedAt, closedAt, 
                        openingCash, closingCash, status(open/closed)
pos_orders            — id, sessionId, orderNumber, customerId(nullable), 
                        subtotal, discount, tax, total, paymentMethod, 
                        amountPaid, change, notes, status, createdAt
pos_order_items       — id, posOrderId, productId, variantId, nameEn, 
                        qty, unitPrice, discount, lineTotal
pos_payment_methods   — id, name, type(cash/card/upi/store_credit), isActive
```

### Features
- Full-screen cashier terminal (touch-friendly)
- Product search + barcode scan (keyboard shortcut)
- Cart with quantity adjustment, line discounts
- Multiple payment methods (cash, card, split)
- Cash drawer: open session with opening balance, close with cash count
- Receipt printing (print-friendly view + PDF)
- Customer lookup / walk-in (anonymous)
- Apply discount rules engine (same as e-commerce)
- Shift summary report (sales, payment breakdown, cash variance)
- Offline-capable (localStorage queue, sync on reconnect)

---

## Module 3: Manufacturing

### Data Model
```
raw_materials         — id, name, unit(kg/g/L/pcs), costPerUnit, 
                        stockQty, reorderPoint, supplierId
recipes               — id, productId, name, yieldQty, yieldUnit, 
                        notes, isActive, createdAt
recipe_ingredients    — id, recipeId, rawMaterialId, qty, unit, notes
production_orders     — id, recipeId, productId, plannedQty, actualQty, 
                        status(draft/in_progress/completed/cancelled),
                        scheduledDate, completedDate, batchNumber,
                        totalCost, notes, createdBy, createdAt
production_order_ingredients — id, productionOrderId, rawMaterialId, 
                               plannedQty, actualQty, costPerUnit, totalCost
suppliers             — id, name, contactName, phone, email, address, notes
purchase_orders       — id, supplierId, status(draft/sent/received/cancelled),
                        totalAmount, notes, createdAt, receivedAt
purchase_order_items  — id, purchaseOrderId, rawMaterialId, qty, unitCost, totalCost
```

### Features
- Bill of Materials (BOM) / Recipe builder per finished product
- Production order creation (select recipe → set quantity → schedule)
- Production order workflow: Draft → In Progress → Completed
- Auto-deduct raw materials from inventory on completion
- Auto-add finished goods to inventory on completion
- Cost of goods calculation (ingredient cost + overhead)
- Batch/lot tracking with batch numbers
- Supplier management
- Purchase orders for raw material procurement
- Production schedule calendar view

---

## Module 4: Accounting

### Data Model
```
accounts              — id, code, name, type(asset/liability/equity/revenue/expense),
                        subtype, parentId, isActive, balance, description
journal_entries       — id, entryNumber, date, description, refType, refId,
                        status(draft/posted), createdBy, createdAt, postedAt
journal_lines         — id, journalEntryId, accountId, debit, credit, description
fiscal_years          — id, name, startDate, endDate, isClosed
tax_rates             — id, name, rate, type(vat/withholding), isDefault, isActive
```

### Default Chart of Accounts (UAE/Arabic business)
```
1000 - Assets
  1100 - Cash & Bank
    1110 - Cash on Hand
    1120 - Bank Account
  1200 - Accounts Receivable
  1300 - Inventory
  1400 - Raw Materials
  1500 - Prepaid Expenses
2000 - Liabilities
  2100 - Accounts Payable
  2200 - VAT Payable
  2300 - Accrued Expenses
3000 - Equity
  3100 - Owner's Capital
  3200 - Retained Earnings
4000 - Revenue
  4100 - Sales Revenue
  4200 - POS Sales
  4300 - Other Income
5000 - Cost of Goods Sold
  5100 - COGS - Products
  5200 - COGS - Manufacturing
6000 - Operating Expenses
  6100 - Salaries
  6200 - Rent
  6300 - Utilities
  6400 - Marketing
  6500 - Packaging
```

### Auto-Journal Entries (Integration)
| Event | Debit | Credit |
|---|---|---|
| E-commerce sale | Accounts Receivable | Sales Revenue |
| POS cash sale | Cash on Hand | POS Sales |
| POS card sale | Bank Account | POS Sales |
| VAT collected | Sales Revenue | VAT Payable |
| Purchase order received | Raw Materials | Accounts Payable |
| Production completed | Inventory (COGS) | Raw Materials |
| Payment received | Cash/Bank | Accounts Receivable |

### Reports
- **Profit & Loss** (Revenue − COGS − Expenses) by date range
- **Balance Sheet** (Assets = Liabilities + Equity) at any date
- **Trial Balance** (all account balances)
- **General Ledger** (all transactions per account)
- **VAT Report** (input/output VAT for filing)
- **Cash Flow** summary

---

## Integration Points

```
E-commerce Order Placed
  → stock_movements (type: sale, -qty per item per warehouse)
  → journal_entry (DR: Accounts Receivable, CR: Sales Revenue + VAT Payable)

POS Sale Completed
  → pos_orders record
  → stock_movements (type: sale, -qty)
  → journal_entry (DR: Cash/Card, CR: POS Sales + VAT Payable)

Production Order Completed
  → stock_movements (type: production, -raw materials, +finished goods)
  → journal_entry (DR: Inventory, CR: Raw Materials + Labour)

Purchase Order Received
  → raw_materials stockQty += received qty
  → journal_entry (DR: Raw Materials, CR: Accounts Payable)
```

---

## Admin Navigation Structure (Updated)

```
Dashboard
── E-Commerce ──
  Products
  Orders
  Customers
  Categories
  Coupons
  Discount Rules
── Inventory ──
  Stock Levels        /admin/inventory
  Stock Movements     /admin/inventory/movements
  Adjustments         /admin/inventory/adjustments
  Warehouses          /admin/inventory/warehouses
── POS ──
  POS Terminal        /admin/pos  (full-screen)
  POS Sessions        /admin/pos/sessions
  POS Orders          /admin/pos/orders
── Manufacturing ──
  Recipes / BOMs      /admin/manufacturing/recipes
  Production Orders   /admin/manufacturing/production
  Raw Materials       /admin/manufacturing/materials
  Suppliers           /admin/manufacturing/suppliers
  Purchase Orders     /admin/manufacturing/purchases
── Accounting ──
  Chart of Accounts   /admin/accounting/accounts
  Journal Entries     /admin/accounting/journal
  P&L Report          /admin/accounting/pnl
  Balance Sheet       /admin/accounting/balance-sheet
  VAT Report          /admin/accounting/vat
── Tools ──
  Analytics
  WooCommerce Import
  Push Notifications
  Tracking Pixels
  Settings
```
