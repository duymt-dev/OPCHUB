-- Removes draft batches/results only. Never delete already saved scripts or chat content.
DROP TABLE bot_bulk_items;
DROP TABLE bot_bulk_batches;
DROP INDEX bot_scripts_line_hashes_idx;
DROP FUNCTION bot_script_line_hashes(jsonb);
DROP FUNCTION bot_bulk_line_key(text);
