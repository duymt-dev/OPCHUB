-- D-112: use the same case/punctuation/Vietnamese normalization as the shared domain.
CREATE FUNCTION bot_bulk_line_key(body text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT regexp_replace(lower(coalesce(body, '')) COLLATE "C", '[^a-zà-ỹ0-9]', '', 'g')
$$;

-- The expression index automatically follows every script write, including seeds/direct SQL.
CREATE FUNCTION bot_script_line_hashes(content jsonb) RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT ARRAY(
    SELECT DISTINCT encode(sha256(convert_to(bot_bulk_line_key(line->>'body'), 'UTF8')), 'hex') AS hash
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(content) = 'array' THEN content ELSE '[]'::jsonb END) line
    WHERE jsonb_typeof(line->'body') = 'string' AND bot_bulk_line_key(line->>'body') <> ''
    ORDER BY hash
  )
$$;
CREATE INDEX bot_scripts_line_hashes_idx ON bot_scripts USING GIN (bot_script_line_hashes(lines))
WITH (fastupdate = off);

CREATE TABLE bot_bulk_batches (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  topics TEXT[] NOT NULL,
  type_name TEXT NOT NULL,
  type_description TEXT NOT NULL,
  per_topic INTEGER NOT NULL,
  turns INTEGER NOT NULL,
  delay_minutes INTEGER NOT NULL,
  group_ids TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  total INTEGER NOT NULL,
  cursor INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  claim_id TEXT,
  lease_until TIMESTAMPTZ(6),
  next_at TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT bot_bulk_batches_input_check CHECK (
    cardinality(topics) BETWEEN 1 AND 100 AND array_position(topics, NULL) IS NULL
    AND cardinality(group_ids) BETWEEN 1 AND 100 AND array_position(group_ids, NULL) IS NULL
    AND per_topic BETWEEN 1 AND 5 AND turns BETWEEN 2 AND 8 AND delay_minutes BETWEEN 1 AND 60
    AND char_length(type_name) BETWEEN 1 AND 60 AND char_length(type_description) <= 2000
    AND total = cardinality(topics) * per_topic
  ),
  CONSTRAINT bot_bulk_batches_progress_check CHECK (
    cursor BETWEEN 0 AND total AND attempts BETWEEN 0 AND 3
    AND (claim_id IS NULL) = (lease_until IS NULL)
    AND (
      (status = 'running' AND cursor < total AND next_at IS NOT NULL AND error IS NULL)
      OR (status = 'done' AND cursor = total AND next_at IS NULL AND error IS NULL AND claim_id IS NULL)
      OR (status = 'failed' AND cursor < total AND next_at IS NULL AND claim_id IS NULL
        AND error IS NOT NULL AND error IN ('provider','invalid_response','duplicate','personas_missing','groups_missing'))
    )
  )
);
CREATE UNIQUE INDEX bot_bulk_batches_actor_id_request_id_key ON bot_bulk_batches(actor_id, request_id);
CREATE INDEX bot_bulk_batches_actor_id_created_at_id_idx ON bot_bulk_batches(actor_id, created_at DESC, id DESC);
CREATE INDEX bot_bulk_batches_status_next_at_id_idx ON bot_bulk_batches(status, next_at, id)
INCLUDE (cursor, attempts, lease_until);

CREATE TABLE bot_bulk_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES bot_bulk_batches(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ordinal INTEGER NOT NULL,
  topic TEXT NOT NULL,
  lines JSONB NOT NULL,
  line_hashes TEXT[] NOT NULL,
  selected BOOLEAN NOT NULL DEFAULT true,
  saved_script_id TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT bot_bulk_items_position_check CHECK (ordinal BETWEEN 0 AND 499 AND char_length(topic) BETWEEN 1 AND 200),
  CONSTRAINT bot_bulk_items_lines_check CHECK (
    CASE WHEN jsonb_typeof(lines) = 'array' THEN
      jsonb_array_length(lines) BETWEEN 2 AND 8
      AND cardinality(line_hashes) = jsonb_array_length(lines)
      AND line_hashes = bot_script_line_hashes(lines)
    ELSE false END
  )
);
CREATE UNIQUE INDEX bot_bulk_items_batch_id_ordinal_key ON bot_bulk_items(batch_id, ordinal) INCLUDE (id);
CREATE INDEX bot_bulk_items_line_hashes_idx ON bot_bulk_items USING GIN(line_hashes) WITH (fastupdate = off);
