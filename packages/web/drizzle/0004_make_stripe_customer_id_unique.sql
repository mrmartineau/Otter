DROP INDEX "profiles_stripe_customer_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_stripe_customer_id_idx" ON "profiles" USING btree ("stripe_customer_id");