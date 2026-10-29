CREATE INDEX personas_bulk_groups_idx ON personas USING GIN (group_ids) WITH (fastupdate = off) WHERE enabled;
ALTER INDEX personas_enabled_groups_idx RESET (fastupdate);
