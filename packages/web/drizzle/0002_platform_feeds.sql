CREATE TABLE "platform_connections" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credentials" json NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_error" text,
	"last_synced_at" timestamp with time zone,
	"platform" text NOT NULL,
	"updated_at" timestamp with time zone,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_items" (
	"bookmark_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text,
	"external_id" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" text,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" json,
	"platform" text NOT NULL,
	"title" text,
	"url" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_items" ADD CONSTRAINT "platform_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_items" ADD CONSTRAINT "platform_items_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_connections_user_platform_key" ON "platform_connections" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "platform_connections_user_id_idx" ON "platform_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_items_user_platform_external_key" ON "platform_items" USING btree ("user_id","platform","external_id");--> statement-breakpoint
CREATE INDEX "platform_items_user_platform_idx" ON "platform_items" USING btree ("user_id","platform");
