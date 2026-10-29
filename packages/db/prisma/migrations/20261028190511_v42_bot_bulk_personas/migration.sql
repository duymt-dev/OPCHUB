-- D-112: member preference is an indexed array membership seek; global fallback is ID-first.
CREATE INDEX personas_bulk_groups_idx ON personas USING GIN (group_ids) WITH (fastupdate = off) WHERE enabled;
CREATE INDEX personas_bulk_enabled_idx ON personas (id) WHERE enabled;
