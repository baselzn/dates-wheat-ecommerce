CREATE TABLE `pos_held_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`label` varchar(128),
	`customerName` varchar(128),
	`customerPhone` varchar(32),
	`items` text NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_held_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `pos_held_orders` ADD CONSTRAINT `pos_held_orders_sessionId_pos_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `pos_sessions`(`id`) ON DELETE no action ON UPDATE no action;