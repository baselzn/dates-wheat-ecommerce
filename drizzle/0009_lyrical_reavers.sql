CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameAr` varchar(128),
	`type` enum('asset','liability','equity','revenue','expense','cogs') NOT NULL,
	`subtype` varchar(64),
	`parentId` int,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`isSystem` boolean NOT NULL DEFAULT false,
	`balance` decimal(14,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `fiscal_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isClosed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fiscal_years_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryNumber` varchar(32) NOT NULL,
	`date` timestamp NOT NULL,
	`description` varchar(512) NOT NULL,
	`refType` varchar(64),
	`refId` int,
	`status` enum('draft','posted','reversed') NOT NULL DEFAULT 'draft',
	`reversedBy` int,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`postedAt` timestamp,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `journal_entries_entryNumber_unique` UNIQUE(`entryNumber`)
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journalEntryId` int NOT NULL,
	`accountId` int NOT NULL,
	`debit` decimal(14,2) NOT NULL DEFAULT '0',
	`credit` decimal(14,2) NOT NULL DEFAULT '0',
	`description` varchar(256),
	CONSTRAINT `journal_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`posOrderId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`productName` varchar(256) NOT NULL,
	`sku` varchar(64),
	`qty` decimal(10,3) NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`lineTotal` decimal(10,2) NOT NULL,
	CONSTRAINT `pos_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`sessionId` int NOT NULL,
	`customerId` int,
	`customerName` varchar(128),
	`customerPhone` varchar(32),
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`vatAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`paymentMethod` varchar(64) NOT NULL,
	`amountPaid` decimal(10,2) NOT NULL,
	`change` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('completed','refunded','voided') NOT NULL DEFAULT 'completed',
	`notes` text,
	`receiptPrinted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `pos_payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`type` enum('cash','card','bank_transfer','store_credit','other') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `pos_payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionNumber` varchar(32) NOT NULL,
	`cashierId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`openingCash` decimal(10,2) NOT NULL DEFAULT '0',
	`closingCash` decimal(10,2),
	`expectedCash` decimal(10,2),
	`cashVariance` decimal(10,2),
	`totalSales` decimal(12,2) NOT NULL DEFAULT '0',
	`totalOrders` int NOT NULL DEFAULT 0,
	`notes` text,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `pos_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_sessions_sessionNumber_unique` UNIQUE(`sessionNumber`)
);
--> statement-breakpoint
CREATE TABLE `production_order_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productionOrderId` int NOT NULL,
	`rawMaterialId` int NOT NULL,
	`plannedQty` decimal(10,4) NOT NULL,
	`actualQty` decimal(10,4),
	`unit` enum('kg','g','L','mL','pcs','box','bag','roll') NOT NULL,
	`costPerUnit` decimal(10,4),
	`totalCost` decimal(12,2),
	CONSTRAINT `production_order_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`recipeId` int NOT NULL,
	`productId` int NOT NULL,
	`warehouseId` int,
	`plannedQty` decimal(10,3) NOT NULL,
	`actualQty` decimal(10,3),
	`batchNumber` varchar(64),
	`status` enum('draft','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledDate` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`totalMaterialCost` decimal(12,2),
	`totalOverheadCost` decimal(12,2),
	`totalCost` decimal(12,2),
	`costPerUnit` decimal(10,4),
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`rawMaterialId` int NOT NULL,
	`orderedQty` decimal(12,3) NOT NULL,
	`receivedQty` decimal(12,3) NOT NULL DEFAULT '0',
	`unitCost` decimal(10,4) NOT NULL,
	`totalCost` decimal(12,2) NOT NULL,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`supplierId` int NOT NULL,
	`warehouseId` int,
	`status` enum('draft','sent','partial','received','cancelled') NOT NULL DEFAULT 'draft',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`vatAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` text,
	`expectedDate` timestamp,
	`receivedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `raw_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameAr` varchar(128),
	`code` varchar(64),
	`unit` enum('kg','g','L','mL','pcs','box','bag','roll') NOT NULL,
	`costPerUnit` decimal(10,4) NOT NULL DEFAULT '0',
	`stockQty` decimal(12,3) NOT NULL DEFAULT '0',
	`reorderPoint` decimal(12,3) NOT NULL DEFAULT '0',
	`supplierId` int,
	`warehouseId` int,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `raw_materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `raw_materials_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipeId` int NOT NULL,
	`rawMaterialId` int NOT NULL,
	`qty` decimal(10,4) NOT NULL,
	`unit` enum('kg','g','L','mL','pcs','box','bag','roll') NOT NULL,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `recipe_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`yieldQty` decimal(10,3) NOT NULL,
	`yieldUnit` varchar(32) NOT NULL DEFAULT 'pcs',
	`overheadCost` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustment_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`expectedQty` decimal(12,3) NOT NULL,
	`actualQty` decimal(12,3) NOT NULL,
	`diff` decimal(12,3) NOT NULL,
	`notes` text,
	CONSTRAINT `stock_adjustment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseId` int NOT NULL,
	`reason` enum('cycle_count','damage','expiry','theft','found','opening_stock','other') NOT NULL,
	`notes` text,
	`status` enum('draft','confirmed','cancelled') NOT NULL DEFAULT 'draft',
	`confirmedBy` int,
	`confirmedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`qty` decimal(12,3) NOT NULL DEFAULT '0',
	`reservedQty` decimal(12,3) NOT NULL DEFAULT '0',
	`reorderPoint` decimal(12,3) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('purchase','sale','pos_sale','adjustment','transfer_in','transfer_out','production_in','production_out','return','opening') NOT NULL,
	`warehouseId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`qty` decimal(12,3) NOT NULL,
	`costPerUnit` decimal(10,4),
	`totalCost` decimal(12,2),
	`refType` varchar(64),
	`refId` int,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfer_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`qty` decimal(12,3) NOT NULL,
	`receivedQty` decimal(12,3),
	CONSTRAINT `stock_transfer_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromWarehouseId` int NOT NULL,
	`toWarehouseId` int NOT NULL,
	`status` enum('draft','in_transit','received','cancelled') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdBy` int,
	`receivedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`receivedAt` timestamp,
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`code` varchar(32),
	`contactName` varchar(128),
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`country` varchar(64) DEFAULT 'UAE',
	`vatNumber` varchar(64),
	`paymentTerms` varchar(128),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `tax_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`rate` decimal(6,4) NOT NULL,
	`type` enum('vat','withholding','other') NOT NULL DEFAULT 'vat',
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tax_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`code` varchar(32) NOT NULL,
	`location` varchar(256),
	`address` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_journalEntryId_journal_entries_id_fk` FOREIGN KEY (`journalEntryId`) REFERENCES `journal_entries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_order_items` ADD CONSTRAINT `pos_order_items_posOrderId_pos_orders_id_fk` FOREIGN KEY (`posOrderId`) REFERENCES `pos_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_order_items` ADD CONSTRAINT `pos_order_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD CONSTRAINT `pos_orders_sessionId_pos_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `pos_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD CONSTRAINT `pos_orders_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_sessions` ADD CONSTRAINT `pos_sessions_cashierId_users_id_fk` FOREIGN KEY (`cashierId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_sessions` ADD CONSTRAINT `pos_sessions_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_order_ingredients` ADD CONSTRAINT `production_order_ingredients_productionOrderId_production_orders_id_fk` FOREIGN KEY (`productionOrderId`) REFERENCES `production_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_order_ingredients` ADD CONSTRAINT `production_order_ingredients_rawMaterialId_raw_materials_id_fk` FOREIGN KEY (`rawMaterialId`) REFERENCES `raw_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_recipeId_recipes_id_fk` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchaseOrderId_purchase_orders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_rawMaterialId_raw_materials_id_fk` FOREIGN KEY (`rawMaterialId`) REFERENCES `raw_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_recipeId_recipes_id_fk` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_rawMaterialId_raw_materials_id_fk` FOREIGN KEY (`rawMaterialId`) REFERENCES `raw_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustment_items` ADD CONSTRAINT `stock_adjustment_items_adjustmentId_stock_adjustments_id_fk` FOREIGN KEY (`adjustmentId`) REFERENCES `stock_adjustments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustment_items` ADD CONSTRAINT `stock_adjustment_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_confirmedBy_users_id_fk` FOREIGN KEY (`confirmedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfer_items` ADD CONSTRAINT `stock_transfer_items_transferId_stock_transfers_id_fk` FOREIGN KEY (`transferId`) REFERENCES `stock_transfers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfer_items` ADD CONSTRAINT `stock_transfer_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_fromWarehouseId_warehouses_id_fk` FOREIGN KEY (`fromWarehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_toWarehouseId_warehouses_id_fk` FOREIGN KEY (`toWarehouseId`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_receivedBy_users_id_fk` FOREIGN KEY (`receivedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;