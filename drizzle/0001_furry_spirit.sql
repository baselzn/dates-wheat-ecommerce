CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(64) DEFAULT 'Home',
	`fullName` varchar(128) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`addressLine1` text NOT NULL,
	`addressLine2` text,
	`city` varchar(64) NOT NULL,
	`emirate` varchar(64) NOT NULL,
	`country` varchar(64) NOT NULL DEFAULT 'UAE',
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`userId` int,
	`productId` int NOT NULL,
	`variantId` int,
	`quantity` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(128) NOT NULL,
	`nameAr` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`description` text,
	`imageUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`type` enum('percentage','fixed') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`minOrderAmount` decimal(10,2) DEFAULT '0',
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int,
	`productNameEn` varchar(256) NOT NULL,
	`productNameAr` varchar(256) NOT NULL,
	`variantName` varchar(64),
	`productImage` text,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`userId` int,
	`guestEmail` varchar(320),
	`guestPhone` varchar(32),
	`status` enum('pending','confirmed','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` enum('stripe','cod') NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`stripeSessionId` varchar(128),
	`subtotal` decimal(10,2) NOT NULL,
	`vatAmount` decimal(10,2) NOT NULL,
	`shippingAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`couponCode` varchar(32),
	`shippingFullName` varchar(128),
	`shippingPhone` varchar(32),
	`shippingAddressLine1` text,
	`shippingAddressLine2` text,
	`shippingCity` varchar(64),
	`shippingEmirate` varchar(64),
	`shippingCountry` varchar(64) DEFAULT 'UAE',
	`notes` text,
	`trackingNumber` varchar(64),
	`smsSent` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `otp_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`code` varchar(8) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`userId` int,
	`path` varchar(512) NOT NULL,
	`referrer` text,
	`userAgent` text,
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`nameEn` varchar(64) NOT NULL,
	`nameAr` varchar(64) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`comparePrice` decimal(10,2),
	`stockQty` int NOT NULL DEFAULT 100,
	`sku` varchar(64),
	`isDefault` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`nameEn` varchar(256) NOT NULL,
	`nameAr` varchar(256) NOT NULL,
	`slug` varchar(256) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`basePrice` decimal(10,2) NOT NULL,
	`comparePrice` decimal(10,2),
	`images` json DEFAULT ('[]'),
	`isActive` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isGlutenFree` boolean NOT NULL DEFAULT false,
	`isSugarFree` boolean NOT NULL DEFAULT false,
	`isVegan` boolean NOT NULL DEFAULT false,
	`stockQty` int NOT NULL DEFAULT 100,
	`lowStockThreshold` int NOT NULL DEFAULT 10,
	`sku` varchar(64),
	`weight` decimal(6,2),
	`tags` json DEFAULT ('[]'),
	`metaTitle` varchar(256),
	`metaDescription` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`rating` int NOT NULL,
	`titleEn` varchar(128),
	`bodyEn` text,
	`isApproved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `tracking_pixels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(64) NOT NULL,
	`pixelId` varchar(256),
	`accessToken` text,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`config` json DEFAULT ('{}'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracking_pixels_id` PRIMARY KEY(`id`),
	CONSTRAINT `tracking_pixels_platform_unique` UNIQUE(`platform`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;