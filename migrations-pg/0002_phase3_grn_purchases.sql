ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'credit' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "paid_amount" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "due_amount" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'credit' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "outstanding_balance" numeric DEFAULT '0' NOT NULL;
