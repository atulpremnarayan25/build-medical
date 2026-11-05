ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "related_purchase_id" uuid REFERENCES "purchases"("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_purchase_idx" ON "payments"("related_purchase_id");
