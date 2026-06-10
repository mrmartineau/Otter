CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
DROP INDEX "bookmarks_status_idx";--> statement-breakpoint
DROP INDEX "bookmarks_user_idx";--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "search_text" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("bookmarks"."title", '')), 'A') || setweight(to_tsvector('english', coalesce("bookmarks"."description", '')), 'B') || setweight(to_tsvector('english', coalesce("bookmarks"."note", '')), 'C')) STORED;--> statement-breakpoint
CREATE INDEX "bookmarks_user_created_at_idx" ON "bookmarks" USING btree ("user","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bookmarks_user_status_idx" ON "bookmarks" USING btree ("user","status");--> statement-breakpoint
CREATE INDEX "bookmarks_search_text_idx" ON "bookmarks" USING gin ("search_text");--> statement-breakpoint
CREATE INDEX "bookmarks_tags_idx" ON "bookmarks" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "bookmarks_url_trgm_idx" ON "bookmarks" USING gin ("url" gin_trgm_ops);
