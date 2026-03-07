CREATE TABLE IF NOT EXISTS "day_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"date" date NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_notes_cat_date_uniq" UNIQUE("cat_id","date")
);
--> statement-breakpoint
ALTER TABLE "cats" ADD COLUMN "target_weight_kg" numeric(5, 3);--> statement-breakpoint
ALTER TABLE "cats" ADD COLUMN "photo" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "day_notes" ADD CONSTRAINT "day_notes_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
