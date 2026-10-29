CREATE OR REPLACE FUNCTION bot_script_line_hashes(content jsonb) RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ARRAY(
    SELECT DISTINCT encode(sha256(convert_to(bot_bulk_line_key(line->>'body'), 'UTF8')), 'hex') AS hash
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(content) = 'array' THEN content ELSE '[]'::jsonb END) line
    WHERE jsonb_typeof(line->'body') = 'string' AND bot_bulk_line_key(line->>'body') <> ''
    ORDER BY hash
  )
$$;
