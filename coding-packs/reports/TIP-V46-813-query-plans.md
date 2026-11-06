# TIP-V46-813 — A1 joinedBy query plan

Real PostgreSQL integration run on the approved isolated test DB. Fixture: 10000 groups and 10003 memberships. No planner switches or forced indexes.

`sql

  SELECT g.id, g.name, g.province, g.region, g.kind, g.industry,
         g.parent_id AS "parentId", g.description, g.member_count AS "memberCount",
         g.weekly_active AS "weeklyActive", g.cover_url AS "coverUrl"
  FROM (
    SELECT gm.group_id, g.created_at
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.user_id = $1 AND gm.status = 'member' AND g.deleted_at IS NULL
    ORDER BY g.created_at ASC, g.id ASC
    LIMIT 1000
  ) joined
  JOIN groups g ON g.id = joined.group_id
  ORDER BY joined.created_at ASC, joined.group_id ASC
`

Plan nodes: Nested Loop → Limit → Sort → Nested Loop → Index Scan group_members_user_id_status_idx → Index Scan groups_pkey → Index Scan groups_pkey.

Actual rows: 3; total time: 0.068 ms; shared hits: 27. No Seq Scan. Membership seek is followed by a narrow ID sort/LIMIT and primary-key payload lookup.

Regression also checks the 1000-row technical cap, joined group beyond the first 100, deleted/left/removed exclusion, owned/unread/cover fields, and constant batch-query counts as memberships grow. Raw EXPLAIN ANALYZE BUFFERS JSON: ignored local test-results/v46-813-A1-joined-plan.json.
