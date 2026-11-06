-- Roll back only TIP-810's additive configuration (public links will stop resolving).
DROP INDEX IF EXISTS stores_slug_key;
ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_seo_title_length,
  DROP CONSTRAINT IF EXISTS stores_seo_desc_length,
  DROP CONSTRAINT IF EXISTS stores_slug_format,
  DROP COLUMN slug,
  DROP COLUMN seo_index,
  DROP COLUMN seo_title,
  DROP COLUMN seo_desc;
