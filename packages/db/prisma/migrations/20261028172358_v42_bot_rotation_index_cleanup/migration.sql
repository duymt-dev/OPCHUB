-- Query-plan review: group GIN seek + top-N ID ordering replaces ordered-ID filtering.
-- Remove the unused write-amplifying index; never rewrite the applied expand migration.
DROP INDEX bot_scripts_rotation_cursor_idx;
-- Script catalog writes are infrequent; avoid repeated GIN pending-list scans on every tick/group.
ALTER INDEX bot_scripts_rotation_groups_idx SET (fastupdate = off);
