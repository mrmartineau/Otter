CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual', 'lifetime');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "billing_cycle" "billing_cycle";