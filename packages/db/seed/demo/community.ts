import { communities, members } from '@opchub/shared/fixtures';
import {
  buildGroups,
  buildRooms,
  DEFAULT_RULES,
  GROUP_OWNERS,
  isoFromVnDate,
  LOCKED_USERS,
  TOPIC_AUTHORS,
} from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { GROUPS } from '../catalog';
import { userIdByName } from './people';

/**
 * Domain community: 34 nhóm (đưa về mốc prototype kể cả khi e2e đã xoá/sửa), phòng chủ đề,
 * thành viên nhóm (M1–M8 theo `MEMBERS.groups`), chủ nhóm, yêu cầu vào nhóm đang chờ.
 * `member_count` / `weekly_active` = số hiển thị của prototype (COMMS) như mock — Q-B62-4.
 */

/** Mốc tạo nhóm: tăng dần theo thứ tự seed để danh sách (created_at, id) giữ c1, c2, … c34 */
const GROUP_T0 = Date.UTC(2025, 0, 1);
const groupCreatedAt = (i: number) => new Date(GROUP_T0 + i * 1000);

export async function seedGroups(tx: DbTx): Promise<void> {
  const mock = new Map(buildGroups().map((g) => [g.id, g]));
  const rows = GROUPS.map((g, i) => {
    const m = mock.get(g.id);
    return {
      id: g.id,
      name: g.name,
      province: g.province,
      region: g.region,
      description: g.description,
      memberCount: m?.memberCount ?? 0,
      weeklyActive: m?.weeklyActive ?? 0,
      createdAt: groupCreatedAt(i),
    };
  });
  // Một câu UPDATE cho 34 nhóm (không query trong vòng lặp)
  await tx.$executeRaw`
    UPDATE groups g SET name = x.name, province = x.province, region = x.region::region,
      description = x.description,
      member_count = x.member_count, weekly_active = x.weekly_active, rules = ${[...DEFAULT_RULES]}::text[],
      cover_url = NULL, deleted_at = NULL, created_at = x.created_at, updated_at = x.created_at
    FROM unnest(${rows.map((r) => r.id)}::text[], ${rows.map((r) => r.name)}::text[],
                ${rows.map((r) => r.province)}::text[], ${rows.map((r) => r.region)}::text[],
                ${rows.map((r) => r.description)}::text[],
                ${rows.map((r) => r.memberCount)}::int[], ${rows.map((r) => r.weeklyActive)}::int[],
                ${rows.map((r) => r.createdAt)}::timestamptz[])
      AS x(id, name, province, region, description, member_count, weekly_active, created_at)
    WHERE g.id = x.id`;
  await tx.$executeRaw`
    UPDATE rooms r SET name = 'Chung', description = 'Phòng mặc định của nhóm', created_by = NULL,
      created_at = g.created_at, updated_at = g.created_at
    FROM groups g WHERE r.group_id = g.id AND r.is_default AND r.slug = 'general'`;
}

/** Phòng chủ đề ngoài phòng Chung (TOPIC_SEED) — id `<nhóm>-<khoá>` như mock (URL /chat/c1/qa) */
export async function seedTopicRooms(tx: DbTx): Promise<void> {
  const order = new Map(communities.map((c, i) => [c.id, i]));
  const topics = buildRooms().filter((r) => !r.isDefault);
  await tx.room.createMany({
    data: topics.map((r, i) => {
      const slug = r.id.slice(r.groupId.length + 1);
      const at = groupCreatedAt(order.get(r.groupId) ?? 0).getTime() + (i + 1) * 60_000;
      return {
        id: r.id,
        groupId: r.groupId,
        slug,
        name: r.name,
        description: r.description,
        createdBy: userIdByName(TOPIC_AUTHORS[`${r.groupId}:${slug}`] ?? ''),
        isDefault: false,
        createdAt: new Date(at),
        updatedAt: new Date(at),
      };
    }),
  });
}

/**
 * Chủ nhóm (Q-B62-5, Q-B62-15): c1, c6 → TK demo (GROUP_OWNERS). Nhóm khác: mock gán Lê Minh Anh
 * (m2) — chỉ ghi khi m2 là thành viên; không thì thành viên đầu tiên chưa bị khoá (form sửa nhóm
 * của Admin bắt buộc có chủ nhóm). Không thêm người để giữ số thành viên.
 */
function ownersOf(): Map<string, string> {
  const out = new Map(Object.entries(GROUP_OWNERS));
  for (const m of members) {
    for (const g of m.groups) {
      if (out.has(g) || LOCKED_USERS.includes(m.id)) continue;
      const m2In = members.some((x) => x.id === 'm2' && x.groups.includes(g));
      out.set(g, m2In ? 'm2' : m.id);
    }
  }
  return out;
}

export async function seedGroupMembers(tx: DbTx): Promise<void> {
  const owners = ownersOf();
  const joined = members.flatMap((m) =>
    m.groups.map((groupId, i) => ({
      groupId,
      userId: m.id,
      // Prototype ROLE(): chủ nhóm → hồ sơ "Giảng viên" là Giảng viên trong nhóm (GR-R02) → Thành viên
      groupRole:
        owners.get(groupId) === m.id
          ? ('owner' as const)
          : m.role === 'Giảng viên'
            ? ('lecturer' as const)
            : ('member' as const),
      status: 'member' as const,
      createdAt: new Date(Date.parse(isoFromVnDate(m.date)) + i * 1000),
    })),
  );
  // D-71: không còn yêu cầu chờ duyệt
  await tx.groupMember.createMany({
    data: joined.map((r) => ({ ...r, updatedAt: r.createdAt })),
  });
}
