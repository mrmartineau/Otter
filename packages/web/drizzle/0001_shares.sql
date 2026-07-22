CREATE TYPE "public"."share_kind" AS ENUM('tag', 'collection');--> statement-breakpoint
CREATE TABLE "shares" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "share_kind" NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shares_token_key" ON "shares" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "shares_user_kind_name_key" ON "shares" USING btree ("user_id","kind","name");--> statement-breakpoint
CREATE INDEX "shares_user_id_idx" ON "shares" USING btree ("user_id");
