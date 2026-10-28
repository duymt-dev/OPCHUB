-- TIP-V42-711 QT-ST-PJ: store/status equality before newest-first ordering.
-- Generated with migrate dev --create-only; retain every existing hand-written index.
-- Payload used by BR-08/BR-TRIAL-04 is included, not part of the sort key.
CREATE INDEX "projects_store_feed_idx"
ON "projects" ("store_id", "status", "published_at" DESC, "id" DESC)
INCLUDE ("owner_id", "visibility", "deleted_at");
