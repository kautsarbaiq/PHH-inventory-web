CREATE INDEX "master_sheets_parent_id_idx" ON "master_sheets" USING btree ("parent_id");--> statement-breakpoint
-- Remove any pre-existing duplicate (group_id, sheet_id) rows (keep earliest)
-- so the unique index below can be created safely on existing data.
DELETE FROM "sheet_group_items"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "group_id", "sheet_id"
             ORDER BY "created_at" ASC, "id" ASC
           ) AS rn
    FROM "sheet_group_items"
  ) t
  WHERE t.rn > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "sheet_group_items_group_sheet_unique" ON "sheet_group_items" USING btree ("group_id","sheet_id");