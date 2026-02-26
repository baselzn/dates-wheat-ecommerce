CREATE TABLE `discount_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('cart_total','bogo','quantity_tier','category_discount','product_discount','user_role','first_order','free_shipping') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`usageLimit` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`conditions` text NOT NULL,
	`actions` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_rules_id` PRIMARY KEY(`id`)
);
