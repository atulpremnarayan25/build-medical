ALTER TABLE `products` ADD `pack_size` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `drug_schedule` text DEFAULT 'none' NOT NULL;