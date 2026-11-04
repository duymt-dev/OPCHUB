-- D-128: one seek per affiliate to its earliest live membership, not a scan/sort of all memberships.
CREATE INDEX group_members_regional_earliest ON group_members (user_id, status, created_at, group_id);
