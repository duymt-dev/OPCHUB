-- V46-801 / D-120. create-only was refused by existing migration checksum drift;
-- additive DDL extracted from migrate diff, preserving all hand-written existing indexes.
ALTER TYPE "membership_fee_status" ADD VALUE 'regional_director';
ALTER TYPE "mail_kind" ADD VALUE 'director_appointed';
ALTER TYPE "mail_kind" ADD VALUE 'director_revoked';

ALTER TABLE membership_fees
  ADD COLUMN director_previous_status membership_fee_status,
  ADD COLUMN director_previous_valid_until timestamptz(6),
  ADD CONSTRAINT membership_fees_director_snapshot CHECK (
    (status::text = 'regional_director' AND director_previous_status IS NOT NULL
      AND director_previous_status::text <> 'regional_director'
      AND valid_until IS NOT DISTINCT FROM director_previous_valid_until)
    OR (status::text <> 'regional_director' AND director_previous_status IS NULL
      AND director_previous_valid_until IS NULL)
  );

CREATE TABLE regional_directors (
  region region PRIMARY KEY,
  user_id text UNIQUE REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  appointed_at timestamptz(6),
  bank_name text, bank_no text, bank_holder text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL,
  CONSTRAINT regional_directors_incumbent CHECK ((user_id IS NULL) = (appointed_at IS NULL)),
  CONSTRAINT regional_directors_bank CHECK (
    (bank_name IS NULL AND bank_no IS NULL AND bank_holder IS NULL)
    OR (length(bank_name) BETWEEN 1 AND 100 AND bank_no ~ '^[0-9]{6,19}$'
      AND bank_holder ~ '^[A-Z ]+$')
  )
);
INSERT INTO regional_directors (region, updated_at) VALUES ('north', now()), ('central', now()), ('south', now());

CREATE FUNCTION prevent_director_slot_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'D-120: regional director slots cannot be deleted';
END $$;
CREATE TRIGGER regional_directors_keep_slots BEFORE DELETE ON regional_directors
  FOR EACH ROW EXECUTE FUNCTION prevent_director_slot_delete();

CREATE TABLE regional_director_provinces (
  province text PRIMARY KEY,
  region region NOT NULL REFERENCES regional_directors(region) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL
);
CREATE INDEX regional_director_provinces_region_province_idx ON regional_director_provinces(region, province);

CREATE TABLE regional_director_history (
  id text PRIMARY KEY,
  region region NOT NULL,
  action text NOT NULL CHECK (action IN ('appointed', 'revoked', 'updated')),
  user_id text, member_name text,
  actor_id text NOT NULL, actor_name text NOT NULL, actor_role text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX regional_director_history_keyset ON regional_director_history(created_at DESC, id DESC)
  INCLUDE (region, action, member_name, actor_name, actor_role, summary);
CREATE INDEX regional_director_history_region_keyset ON regional_director_history(region, created_at DESC, id DESC)
  INCLUDE (action, member_name, actor_name, actor_role, summary);

CREATE INDEX users_director_search ON users USING gin (
  immutable_unaccent(full_name || ' ' || email::text || ' ' || member_code) gin_trgm_ops
) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX users_director_page ON users(created_at DESC, id DESC)
  INCLUDE (full_name, email, member_code) WHERE deleted_at IS NULL AND status = 'active';

INSERT INTO admin_role_permissions (role_id, permission_key)
  SELECT id, 'affiliate.gdv' FROM admin_roles WHERE key = 'admin'
  ON CONFLICT DO NOTHING;
