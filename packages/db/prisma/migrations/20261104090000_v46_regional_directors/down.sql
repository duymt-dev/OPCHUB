-- Manual rollback only. Enum values are retained: PostgreSQL cannot remove one safely.
DELETE FROM admin_role_permissions WHERE permission_key = 'affiliate.regional';
DROP TABLE regional_director_events;
DROP TABLE regional_director_provinces;
DROP TABLE regional_directors;
DROP INDEX users_regional_candidates;
DROP TYPE regional_director_action;
