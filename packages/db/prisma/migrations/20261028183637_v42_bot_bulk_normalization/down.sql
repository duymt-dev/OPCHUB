BEGIN;
CREATE OR REPLACE FUNCTION bot_bulk_line_key(body text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT regexp_replace(lower(coalesce(body, '')) COLLATE "C", '[^a-zà-ỹ0-9]', '', 'g')
$$;
UPDATE bot_bulk_items SET line_hashes = bot_script_line_hashes(lines), updated_at = now()
WHERE line_hashes IS DISTINCT FROM bot_script_line_hashes(lines);
REINDEX INDEX bot_scripts_line_hashes_idx;
COMMIT;
