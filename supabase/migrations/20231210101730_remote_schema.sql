drop policy "Enable all operations for authenticated users only" on "public"."bookmarks";

drop policy "Can view their own profile" on "public"."profiles";

drop policy "Users can update own profile." on "public"."profiles";

drop policy "Authenticated users" on "public"."toots";

drop policy "Enable insert for authenticated users only" on "public"."tweets";

drop view if exists "public"."types_count";

alter table "public"."bookmarks" alter column "type" drop default;

alter type "public"."type" rename to "type__old_version_to_be_dropped";

create type "public"."type" as enum ('link', 'video', 'audio', 'recipe', 'image', 'document', 'article', 'game', 'book', 'event', 'product', 'note', 'file', 'place');

alter table "public"."bookmarks" alter column type type "public"."type" using type::text::"public"."type";

alter table "public"."bookmarks" alter column "type" set default 'link'::type;

drop type "public"."type__old_version_to_be_dropped";

alter table "public"."bookmarks" add column "public" boolean not null default false;

create or replace view "public"."types_count" as  SELECT bookmarks.type,
    count(*) AS count
   FROM bookmarks
  WHERE ((bookmarks.status = 'active'::status) AND (bookmarks."user" = auth.uid()))
  GROUP BY bookmarks.type
  ORDER BY (count(*)) DESC;


create policy "Can view or do anything for users own items"
on "public"."bookmarks"
as permissive
for all
to public
using ((auth.uid() = "user"))
with check ((auth.uid() = "user"));


create policy "Can update own user data."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Can view own user data."
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Can view or do anything for users own items"
on "public"."toots"
as permissive
for all
to public
using ((auth.uid() = db_user_id))
with check ((auth.uid() = db_user_id));


create policy "Can view or do anything for users own items"
on "public"."tweets"
as permissive
for all
to public
using ((auth.uid() = db_user_id))
with check ((auth.uid() = db_user_id));
