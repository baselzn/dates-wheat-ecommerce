CREATE TABLE `admin_otps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(6) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`used` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `admin_otps_id` PRIMARY KEY(`id`)
);
