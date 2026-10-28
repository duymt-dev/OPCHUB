-- Reuse the existing equivalent partial membership GIN; no duplicated write/index cost.
ALTER INDEX personas_enabled_groups_idx SET (fastupdate = off);
DROP INDEX personas_bulk_groups_idx;
