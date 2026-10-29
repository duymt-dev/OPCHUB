ALTER INDEX bot_scripts_rotation_groups_idx SET (fastupdate = on);
CREATE INDEX bot_scripts_rotation_cursor_idx ON bot_scripts (id) INCLUDE (run_at) WHERE enabled;
