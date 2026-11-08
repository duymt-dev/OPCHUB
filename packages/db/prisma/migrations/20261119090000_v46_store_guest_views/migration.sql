CREATE TABLE store_daily_guest_views (
  store_id TEXT NOT NULL,
  day DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  CONSTRAINT store_daily_guest_views_pkey PRIMARY KEY (store_id, day),
  CONSTRAINT store_daily_guest_views_store_id_fkey FOREIGN KEY (store_id)
    REFERENCES stores(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Equality is in the partial predicate; ordered keyset IDs and visibility payload are covered.
CREATE INDEX stores_public_sitemap_page ON stores(updated_at DESC, id DESC)
  INCLUDE (owner_id, slug) WHERE status='published' AND seo_index=true;
