-- Manual rollback only. Stop application writes first; preserve director history externally.
-- Enum values are intentionally left in place (Postgres cannot DROP VALUE safely).
UPDATE membership_fees SET
  status = CASE WHEN director_previous_valid_until > now()
    AND director_previous_status::text IN ('trial', 'active', 'expiring')
    THEN director_previous_status ELSE 'pending_payment'::membership_fee_status END,
  valid_until = director_previous_valid_until,
  director_previous_status = NULL, director_previous_valid_until = NULL,
  version = version + 1, updated_at = now()
WHERE status::text = 'regional_director';
DELETE FROM admin_role_permissions WHERE permission_key = 'affiliate.gdv';
DROP INDEX users_director_search;
DROP INDEX users_director_page;
DROP TABLE regional_director_history;
DROP TABLE regional_director_provinces;
DROP TABLE regional_directors;
DROP FUNCTION prevent_director_slot_delete();
ALTER TABLE membership_fees DROP CONSTRAINT membership_fees_director_snapshot,
  DROP COLUMN director_previous_status, DROP COLUMN director_previous_valid_until;
