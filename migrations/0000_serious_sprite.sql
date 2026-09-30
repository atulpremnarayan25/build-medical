CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`batch_number` text NOT NULL,
	`expiry_date` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`purchase_rate` real DEFAULT 0 NOT NULL,
	`selling_rate` real DEFAULT 0 NOT NULL,
	`supplier_id` text,
	`supplier_name` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`phone` text,
	`email` text,
	`address` text,
	`gstin` text,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`outstanding_balance` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`party_id` text NOT NULL,
	`party_name` text NOT NULL,
	`party_type` text NOT NULL,
	`type` text NOT NULL,
	`reference` text NOT NULL,
	`particulars` text NOT NULL,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`balance` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`party_id` text NOT NULL,
	`party_name` text NOT NULL,
	`party_type` text NOT NULL,
	`invoice_id` text,
	`invoice_number` text,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`reference` text,
	`date` text NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`generic_name` text,
	`manufacturer` text,
	`category` text,
	`hsn` text,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`selling_rate` real DEFAULT 0 NOT NULL,
	`purchase_rate` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`batch_id` text,
	`batch_number` text NOT NULL,
	`expiry_date` text NOT NULL,
	`quantity` integer NOT NULL,
	`free_quantity` integer DEFAULT 0 NOT NULL,
	`mrp` real NOT NULL,
	`purchase_rate` real NOT NULL,
	`discount` real NOT NULL,
	`taxable_amount` real NOT NULL,
	`gst_rate` real NOT NULL,
	`gst_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`invoice_date` text NOT NULL,
	`supplier_id` text NOT NULL,
	`supplier_name` text NOT NULL,
	`subtotal` real NOT NULL,
	`discount_total` real NOT NULL,
	`taxable_total` real NOT NULL,
	`gst_total` real NOT NULL,
	`round_off` real NOT NULL,
	`grand_total` real NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`due_amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`status` text NOT NULL,
	`payment_status` text NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`batch_id` text NOT NULL,
	`batch_number` text NOT NULL,
	`expiry_date` text NOT NULL,
	`quantity` integer NOT NULL,
	`mrp` real NOT NULL,
	`rate` real NOT NULL,
	`discount` real NOT NULL,
	`taxable_amount` real NOT NULL,
	`gst_rate` real NOT NULL,
	`gst_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`date` text NOT NULL,
	`customer_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`subtotal` real NOT NULL,
	`discount_total` real NOT NULL,
	`taxable_total` real NOT NULL,
	`gst_total` real NOT NULL,
	`round_off` real NOT NULL,
	`grand_total` real NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`due_amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`status` text NOT NULL,
	`payment_status` text NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_number_unique` ON `sales` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`phone` text,
	`email` text,
	`address` text,
	`gstin` text,
	`outstanding_balance` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);