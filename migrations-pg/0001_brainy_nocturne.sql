ALTER TABLE "products" ADD COLUMN "generic_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mrp" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "selling_rate" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "purchase_rate" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pack_size" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drug_schedule" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "patient_name" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "prescriber_name" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "prescriber_reg_no" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "invoice_prefix" text DEFAULT 'INV';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "invoice_terms" text;