CREATE TABLE `inventory_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`batchNumber` varchar(64) NOT NULL,
	`lotNumber` varchar(64),
	`expiryDate` date,
	`manufactureDate` date,
	`quantity` decimal(12,3) NOT NULL DEFAULT '0',
	`costPerUnit` decimal(10,4),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_split_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`posOrderId` int NOT NULL,
	`paymentMethod` varchar(64) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reference` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_split_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_warehouseId_warehouses_id_fk` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_favorites` ADD CONSTRAINT `pos_favorites_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_split_payments` ADD CONSTRAINT `pos_split_payments_posOrderId_pos_orders_id_fk` FOREIGN KEY (`posOrderId`) REFERENCES `pos_orders`(`id`) ON DELETE cascade ON UPDATE no action;