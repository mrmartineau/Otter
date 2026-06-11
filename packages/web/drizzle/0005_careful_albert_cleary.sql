CREATE TABLE "feed_subscriptions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"feed_url" text NOT NULL,
	"folder" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_url" text,
	"title" text,
	"updated_at" timestamp with time zone,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "settings_feeds_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_subscriptions" ADD CONSTRAINT "feed_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_subscriptions_user_feed_url_key" ON "feed_subscriptions" USING btree ("user_id","feed_url");--> statement-breakpoint
CREATE INDEX "feed_subscriptions_user_id_idx" ON "feed_subscriptions" USING btree ("user_id");