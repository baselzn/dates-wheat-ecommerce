ALTER TABLE `products` MODIFY COLUMN `images` json;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `tracking_pixels` MODIFY COLUMN `config` json;