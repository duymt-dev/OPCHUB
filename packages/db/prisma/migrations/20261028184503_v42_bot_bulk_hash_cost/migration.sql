-- Materialize one normalized value per line. The prior SQL expression computed regex/lower twice.
-- Same sorted hashes, so existing expression-index entries remain correct without rebuilding.
CREATE OR REPLACE FUNCTION bot_script_line_hashes(content jsonb) RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  WITH normalized AS MATERIALIZED (
    SELECT bot_bulk_line_key(line->>'body') AS value
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(content) = 'array' THEN content ELSE '[]'::jsonb END) line
    WHERE jsonb_typeof(line->'body') = 'string'
  )
  SELECT ARRAY(
    SELECT DISTINCT encode(sha256(convert_to(value, 'UTF8')), 'hex') AS hash
    FROM normalized WHERE value <> '' ORDER BY hash
  )
$$;
