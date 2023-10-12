
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

ALTER SCHEMA "public" OWNER TO "postgres";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."status" AS ENUM (
    'active',
    'inactive'
);

ALTER TYPE "public"."status" OWNER TO "postgres";

CREATE TYPE "public"."type" AS ENUM (
    'link',
    'video',
    'audio',
    'recipe',
    'image',
    'document',
    'article',
    'game',
    'book',
    'event',
    'product',
    'note',
    'file'
);

ALTER TYPE "public"."type" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "title" "text",
    "url" "text",
    "description" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "modified_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "note" "text",
    "star" boolean DEFAULT false NOT NULL,
    "status" "public"."status" DEFAULT 'active'::"public"."status" NOT NULL,
    "click_count" smallint DEFAULT '0'::smallint NOT NULL,
    "type" "public"."type" DEFAULT 'link'::"public"."type",
    "image" "text",
    "tweet" "json",
    "feed" "text",
    "user" "uuid" DEFAULT "auth"."uid"()
);

ALTER TABLE "public"."bookmarks" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."check_url"("url_input" "text") RETURNS SETOF "public"."bookmarks"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query SELECT *
  FROM bookmarks
  WHERE status='active'
  AND url ILIKE ('%' || url_input || '%')
  and bookmarks.user = auth.uid();
end;
$$;

ALTER FUNCTION "public"."check_url"("url_input" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
  END;
  $$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone,
    "settings_tags_visible" boolean DEFAULT false NOT NULL,
    "settings_types_visible" boolean DEFAULT false NOT NULL,
    "settings_group_by_date" boolean DEFAULT false,
    "settings_top_tags_count" numeric,
    "settings_pinned_tags" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."tags_count" AS
 SELECT "btrim"("unnest"("bookmarks"."tags")) AS "tag",
    "count"(DISTINCT "bookmarks"."id") AS "count"
   FROM "public"."bookmarks"
  WHERE (("bookmarks"."status" = 'active'::"public"."status") AND ("bookmarks"."user" = "auth"."uid"()))
  GROUP BY ("btrim"("unnest"("bookmarks"."tags")))
  ORDER BY ("count"(DISTINCT "bookmarks"."id")) DESC;

ALTER TABLE "public"."tags_count" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."toots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "text" "text" DEFAULT ''::"text",
    "urls" "json",
    "toot_id" "text",
    "user_id" "text",
    "user_name" "text",
    "user_avatar" "text",
    "toot_url" "text",
    "media" "json",
    "reply" "json",
    "hashtags" "text"[],
    "liked_toot" boolean DEFAULT false NOT NULL,
    "db_user_id" "uuid" DEFAULT "auth"."uid"()
);

ALTER TABLE "public"."toots" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."tweets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "text" "text" DEFAULT ''::"text",
    "urls" "json",
    "tweet_id" "text",
    "user_id" "text",
    "user_name" "text",
    "user_avatar" "text",
    "tweet_url" "text",
    "media" "json",
    "reply" "json",
    "hashtags" "text"[],
    "liked_tweet" boolean DEFAULT false NOT NULL,
    "db_user_id" "uuid" DEFAULT "auth"."uid"()
);

ALTER TABLE "public"."tweets" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."types_count" AS
 SELECT "bookmarks"."type",
    "count"(*) AS "count"
   FROM "public"."bookmarks"
  WHERE (("bookmarks"."status" = 'active'::"public"."status") AND ("bookmarks"."user" = "auth"."uid"()))
  GROUP BY "bookmarks"."type"
  ORDER BY ("count"(*)) DESC;

ALTER TABLE "public"."types_count" OWNER TO "postgres";

ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");

ALTER TABLE ONLY "public"."toots"
    ADD CONSTRAINT "toots_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."toots"
    ADD CONSTRAINT "toots_toot_id_key" UNIQUE ("toot_id");

ALTER TABLE ONLY "public"."tweets"
    ADD CONSTRAINT "tweets_pkey" PRIMARY KEY ("id");

CREATE POLICY "Authenticated users" ON "public"."toots" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));

CREATE POLICY "Can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));

CREATE POLICY "Enable all operations for authenticated users only" ON "public"."bookmarks" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."tweets" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));

CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));

ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."toots" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tweets" ENABLE ROW LEVEL SECURITY;

REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";

GRANT ALL ON FUNCTION "public"."check_url"("url_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_url"("url_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_url"("url_input" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."tags_count" TO "anon";
GRANT ALL ON TABLE "public"."tags_count" TO "authenticated";
GRANT ALL ON TABLE "public"."tags_count" TO "service_role";

GRANT ALL ON TABLE "public"."toots" TO "anon";
GRANT ALL ON TABLE "public"."toots" TO "authenticated";
GRANT ALL ON TABLE "public"."toots" TO "service_role";

GRANT ALL ON TABLE "public"."tweets" TO "anon";
GRANT ALL ON TABLE "public"."tweets" TO "authenticated";
GRANT ALL ON TABLE "public"."tweets" TO "service_role";

GRANT ALL ON TABLE "public"."types_count" TO "anon";
GRANT ALL ON TABLE "public"."types_count" TO "authenticated";
GRANT ALL ON TABLE "public"."types_count" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
