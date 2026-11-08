-- D-139: equality predicates precede the existing keyset timestamp/id order.
-- ID-only page selection is covering; payload is loaded only after LIMIT.
CREATE INDEX "audit_logs_tag_created_at_id_idx"
  ON "audit_logs" ("tag", "created_at" DESC, "id" DESC);
CREATE INDEX "audit_logs_actor_id_created_at_id_idx"
  ON "audit_logs" ("actor_id", "created_at" DESC, "id" DESC);
