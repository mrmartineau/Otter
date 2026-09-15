CREATE TYPE "public"."reading_state" AS ENUM('pending', 'ready', 'failed', 'archived');--> statement-breakpoint
CREATE TABLE "highlights" (
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"exact" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text,
	"prefix" text,
	"reading_item_id" uuid NOT NULL,
	"suffix" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_items" (
	"author" text,
	"bookmark_id" uuid NOT NULL,
	"content_hash" text,
	"content_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_position" text,
	"last_read_at" timestamp with time zone,
	"progress" real DEFAULT 0 NOT NULL,
	"published_at" text,
	"reading_time_s" integer DEFAULT 0 NOT NULL,
	"site_name" text,
	"state" "reading_state" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_reading_item_id_reading_items_id_fk" FOREIGN KEY ("reading_item_id") REFERENCES "public"."reading_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_items" ADD CONSTRAINT "reading_items_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_items" ADD CONSTRAINT "reading_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "highlights_user_updated_at_idx" ON "highlights" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "highlights_reading_item_id_idx" ON "highlights" USING btree ("reading_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_items_bookmark_id_key" ON "reading_items" USING btree ("bookmark_id");--> statement-breakpoint
CREATE INDEX "reading_items_user_updated_at_idx" ON "reading_items" USING btree ("user_id","updated_at" DESC NULLS LAST);