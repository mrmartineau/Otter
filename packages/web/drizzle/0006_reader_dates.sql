-- Backfilled reading rows were stamped with the sync time. created_at means
-- "when it was saved as a bookmark", so copy the bookmark's date over.
UPDATE "reading_items" ri
SET "created_at" = b."created_at", "updated_at" = now()
FROM "bookmarks" b
WHERE b."id" = ri."bookmark_id"
  AND ri."created_at" > b."created_at" + interval '1 minute';
