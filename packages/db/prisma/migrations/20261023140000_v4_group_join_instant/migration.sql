-- TIP-V4-603 (D-71, REQ-506): bỏ duyệt vào nhóm.
-- 1) Yêu cầu đang chờ của thành viên còn phí → vào nhóm ngay (+ member_count, outbox `group.joined`);
--    chưa đóng phí → xoá yêu cầu.
-- 2) rejected / cancelled → left (dòng cũ được dùng lại khi tham gia lại).
-- 3) Gỡ groups.join_mode + enum group_join_mode; enum group_member_status chỉ còn member / left / removed.

WITH paid AS (
  SELECT gm.group_id, gm.user_id
  FROM group_members gm
  JOIN membership_fees f ON f.user_id = gm.user_id
  WHERE gm.status = 'pending'
    AND f.status IN ('active', 'expiring')
    AND (f.valid_until IS NULL OR f.valid_until > now())
),
promoted AS (
  UPDATE group_members gm
  SET status = 'member', decided_at = now(), updated_at = now()
  FROM paid p
  WHERE gm.group_id = p.group_id AND gm.user_id = p.user_id AND gm.status = 'pending'
  RETURNING gm.group_id, gm.user_id
),
welcomed AS (
  -- Tin chào (thông báo cá nhân) qua consumer `group.joined`, như khi tham gia trực tiếp
  INSERT INTO outbox_events (type, payload, created_at)
  SELECT 'group.joined', jsonb_build_object('groupId', group_id, 'userId', user_id), now()
  FROM promoted
)
UPDATE groups g
SET member_count = g.member_count + c.n, updated_at = now()
FROM (SELECT group_id, count(*)::int AS n FROM promoted GROUP BY group_id) c
WHERE g.id = c.group_id;

DELETE FROM group_members WHERE status = 'pending';

UPDATE group_members SET status = 'left', updated_at = now()
WHERE status IN ('rejected', 'cancelled');

DROP INDEX IF EXISTS "group_members_pending";

ALTER TABLE "group_members" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "group_member_status" RENAME TO "group_member_status_old";
CREATE TYPE "group_member_status" AS ENUM ('member', 'left', 'removed');
ALTER TABLE "group_members"
  ALTER COLUMN "status" TYPE "group_member_status" USING ("status"::text::"group_member_status");
ALTER TABLE "group_members" ALTER COLUMN "status" SET DEFAULT 'member';
DROP TYPE "group_member_status_old";

ALTER TABLE "groups" DROP COLUMN "join_mode";
DROP TYPE "group_join_mode";
