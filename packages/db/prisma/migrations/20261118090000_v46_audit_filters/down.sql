-- Index-only rollback; never mutate or purge append-only audit history.
DROP INDEX "audit_logs_actor_id_created_at_id_idx";
DROP INDEX "audit_logs_tag_created_at_id_idx";
