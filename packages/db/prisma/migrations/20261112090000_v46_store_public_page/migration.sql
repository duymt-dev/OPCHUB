-- BR-494: additive public-page configuration. No business data or status is rewritten.
ALTER TABLE stores
  ADD COLUMN slug TEXT,
  ADD COLUMN seo_index BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN seo_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN seo_desc TEXT NOT NULL DEFAULT '';

-- One statement, stable global creation order. Reserving each chosen slug also handles
-- natural suffix names ("A", "A", "A 2") without a conflicting UPDATE or query loop.
WITH RECURSIVE normalized AS (
  SELECT id, created_at,
    trim(BOTH '-' FROM left(trim(BOTH '-' FROM regexp_replace(
      lower(translate(regexp_replace(normalize(name, NFD), U&'[\0300-\036f]', '', 'g'), 'đĐ', 'dd')),
      '[^a-z0-9]+', '-', 'g')), 60)) AS base
  FROM stores
), ordered AS (
  SELECT id, coalesce(nullif(base, ''), 'gian-hang') AS base,
    row_number() OVER (ORDER BY created_at, id) AS rn FROM normalized
), allocation AS (
  SELECT 0::bigint AS rn, NULL::text AS id, NULL::text AS slug, ARRAY[]::text[] AS taken
  UNION ALL
  SELECT o.rn, o.id, choice.slug, a.taken || choice.slug
  FROM allocation a JOIN ordered o ON o.rn = a.rn + 1
  CROSS JOIN LATERAL (
    SELECT CASE WHEN n = 1 THEN o.base ELSE o.base || '-' || n::text END AS slug
    FROM generate_series(1, o.rn + 1) n
    WHERE NOT (CASE WHEN n = 1 THEN o.base ELSE o.base || '-' || n::text END = ANY(a.taken))
    ORDER BY n LIMIT 1
  ) choice
)
UPDATE stores s SET slug = a.slug FROM allocation a WHERE s.id = a.id;

ALTER TABLE stores
  ADD CONSTRAINT stores_seo_title_length CHECK (char_length(seo_title) <= 70),
  ADD CONSTRAINT stores_seo_desc_length CHECK (char_length(seo_desc) <= 160),
  ADD CONSTRAINT stores_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
CREATE UNIQUE INDEX stores_slug_key ON stores(slug);
