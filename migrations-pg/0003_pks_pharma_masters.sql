ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "code" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telephone" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "mobile_sms" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pin_code" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state_code" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state_name" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pan_no" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "drug_license_no_1" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "drug_license_no_2" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "drug_license_expiry" date;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "fssai_license_no" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_composite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "bill_series" text DEFAULT 'T';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sales_rep" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_days" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "opening_balance" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "default_add_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "default_add_detail" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "default_less_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "default_less_detail" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_person" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "remarks" text;--> statement-breakpoint

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "code" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "telephone" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "pin_code" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "state_code" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "state_name" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "pan_no" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "drug_license_no_1" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "drug_license_no_2" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "drug_license_expiry" date;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "fssai_license_no" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "tds_applicable" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "credit_days" integer DEFAULT 21;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "opening_balance" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contact_person" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "remarks" text;
