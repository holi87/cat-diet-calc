ALTER TABLE "foods" ADD COLUMN "unit" text DEFAULT 'GRAM' NOT NULL;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "kcal_per_piece" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "feed_entries" ADD COLUMN "pieces" numeric(8, 2);
