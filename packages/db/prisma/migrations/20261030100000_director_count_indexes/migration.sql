-- D-120/D-121: equality-leading covering paths for director candidate/count directories.
-- Partial indexes cannot be represented by Prisma schema; keep comments on their models.
CREATE INDEX users_director_count ON users (id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX affiliates_director_active_users ON affiliates (user_id)
  WHERE status = 'active';

CREATE INDEX group_members_director_province_seek ON group_members (user_id, created_at, group_id)
  WHERE status = 'member';
