CREATE INDEX IF NOT EXISTS "sales_store_created_idx" ON "sales"("store_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_store_created_idx" ON "purchases"("store_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_store_name_idx" ON "products"("store_id", "name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products"("barcode");
