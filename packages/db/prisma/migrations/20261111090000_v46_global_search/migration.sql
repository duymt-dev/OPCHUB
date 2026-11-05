-- TIP-V46-808: hand-pruned create-only diff. Preserve every existing FK/index.
CREATE INDEX IF NOT EXISTS stores_search ON stores
  USING gin (immutable_unaccent(name || ' ' || field || ' ' || province) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS needs_search ON needs
  USING gin (immutable_unaccent(title || ' ' || field || ' ' || province) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS projects_search ON projects
  USING gin (immutable_unaccent(name || ' ' || summary) gin_trgm_ops) WHERE deleted_at IS NULL;
