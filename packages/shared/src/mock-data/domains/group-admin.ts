import { recordAudit } from './audit-store';
import { logSetting } from './settings-log';
export { auditLog, recordAudit } from './audit-store';
export type { AuditEntry } from './audit-store';
import type {
  DefaultRoomKey,
  GroupAdminUpsert,
  GroupDetail,
  GroupMemberRow,
  GroupMembersExport,
} from '../../api-domains';
import { members } from '../../fixtures';
import { deleteGroup, upsertGroup } from './ops-community';
import { mockDb, nextId } from './store';
import { conflict, isoFromVnDate, notFound, ok, type MockResult } from './util';

/**
 * Phần mở rộng CSDL giả cho màn Admin "Nhóm cộng đồng" (G4c): chủ nhóm, giảng viên,
 * phòng mặc định, nội quy, ảnh bìa, từ khóa kiểm duyệt, nhật ký audit. WeakMap theo MockDb
 * nên `resetMockDb()` tự dựng lại.
 */

import {
  groupAdminState as state,
  groupAdminExt as extOf,
  type GroupExt,
} from './group-admin-state';
export { DEFAULT_RULES } from './group-admin-state';
import { drainMockGroupOwnerLocks } from './group-lock-jobs';
import { ensureMockGroupStaff } from './group-staff';

export function getGroupDetail(id: string): MockResult<GroupDetail> {
  drainMockGroupOwnerLocks();
  const g = mockDb().groups.find((x) => x.id === id);
  if (!g) return notFound('Không tìm thấy nhóm');
  return ok({ ...g, myStatus: null, ...extOf(id) });
}

const extFrom = (i: GroupAdminUpsert, prev: GroupExt): GroupExt => {
  const ownerId = i.ownerId ?? prev.ownerId;
  return {
    ownerId,
    lecturerIds: [...new Set(i.lecturerIds)].filter((m) => m !== ownerId),
    roomKeys: [...new Set<DefaultRoomKey>(['general', ...i.roomKeys])],
    extraRooms: i.extraRooms,
    rules: i.rules,
  };
};

export function saveGroup(
  actorId: string,
  input: GroupAdminUpsert,
  id?: string,
): MockResult<GroupDetail> {
  const base = {
    name: input.name,
    province: input.province,
    description: input.description,
    joinMode: input.joinMode,
  };
  const r = upsertGroup(base, id);
  if (!r.ok) return r;
  const gid = r.data.id;
  const previous = extOf(gid);
  const ext = extFrom(input, {
    ...previous,
    ownerId: input.ownerId ?? (id ? previous.ownerId || actorId : actorId),
  });
  ensureMockGroupStaff(gid, previous, ext);
  state().ext.set(gid, ext);
  const g = mockDb().groups.find((x) => x.id === gid);
  // BUG-011: ảnh bìa nằm trên dòng nhóm → Portal / rail chat / lưới Admin cùng thấy
  if (g) g.coverUrl = input.coverUrl;
  recordAudit(actorId, id ? 'group.update' : 'group.create', gid, input.name);
  return getGroupDetail(gid);
}

export function removeGroup(actorId: string, id: string): MockResult<{ id: string }> {
  const name = mockDb().groups.find((g) => g.id === id)?.name ?? id;
  const r = deleteGroup(id);
  if (r.ok) {
    state().ext.delete(id);
    recordAudit(actorId, 'group.delete', id, name);
  }
  return r;
}

const COUNTRY: Record<string, string> = {
  vn: 'Việt Nam',
  th: 'Thái Lan',
  id: 'Indonesia',
  sg: 'Singapore',
  my: 'Malaysia',
};

/** Prototype `ROLE()`: chủ nhóm → vai trò đã gán → vai trò hồ sơ "Giảng viên" → Thành viên */
function roleIn(userId: string, seedRole: string, groupId: string): GroupMemberRow['groupRole'] {
  const e = extOf(groupId);
  if (e.ownerId === userId) return 'owner';
  const assigned = state().roles.get(`${groupId}:${userId}`);
  if (assigned) return assigned;
  if (e.lecturerIds.includes(userId) || seedRole === 'Giảng viên') return 'lecturer';
  return 'member';
}

/** Vai trò trong nhóm cho panel thành viên phòng chat (GR-R02) */
export function groupRoleOf(userId: string, groupId: string): GroupMemberRow['groupRole'] {
  drainMockGroupOwnerLocks();
  const m = members.find((x) => x.id === userId);
  return roleIn(userId, m?.role ?? '', groupId);
}

/** GR-R01: ghi vai trò gán — không hạ chủ nhóm, không hạ giảng viên về thành viên */
export function setAssignedRole(userId: string, groupId: string, role: 'lecturer' | 'member') {
  if (extOf(groupId).ownerId === userId) return;
  if (role === 'member' && groupRoleOf(userId, groupId) === 'lecturer') return;
  state().roles.set(`${groupId}:${userId}`, role);
}

/** Thành viên đang ở trong các nhóm đã chọn (một dòng mỗi cặp nhóm–thành viên) */
export function listGroupMembers(groupIds: string[], status: 'all' | 'active' | 'locked') {
  drainMockGroupOwnerLocks();
  const db = mockDb();
  const rows: GroupMemberRow[] = [];
  for (const g of db.groups.filter((x) => groupIds.includes(x.id))) {
    for (const m of members) {
      if (db.groupMembers.get(m.id)?.get(g.id) !== 'member') continue;
      const st = db.userStatus.get(m.id) ?? 'active';
      if (status !== 'all' && st !== status) continue;
      rows.push({
        groupId: g.id,
        groupName: g.name,
        userId: m.id,
        fullName: m.name,
        email: m.email,
        phone: m.phone,
        accountType: m.type === 'biz' ? 'business' : 'personal',
        company: m.company ?? m.org ?? '',
        taxCode: m.tax ?? '',
        groupRole: roleIn(m.id, m.role, g.id),
        country: m.bizCountry ?? COUNTRY[m.cc] ?? 'Việt Nam',
        joinedAt: isoFromVnDate(m.date),
        status: st,
      });
    }
  }
  return rows;
}

/** Số thành viên theo nhóm (cho danh sách chọn nhóm của hộp xuất) */
export function groupMemberCounts(): Record<string, number> {
  drainMockGroupOwnerLocks();
  const out: Record<string, number> = {};
  for (const mine of mockDb().groupMembers.values())
    for (const [gid, st] of mine) if (st === 'member') out[gid] = (out[gid] ?? 0) + 1;
  return out;
}

export function exportGroupMembers(actorId: string, input: GroupMembersExport) {
  const rows = listGroupMembers(input.groupIds, input.status);
  recordAudit(
    actorId,
    'group.members.export',
    input.groupIds.join(','),
    `${rows.length} dòng · ${input.format} · ${input.fields.join(',')}`,
  );
  return ok({ jobId: nextId('job'), status: 'queued' as const, rows: rows.length });
}

export const listKeywords = () => [...state().keywords];

export function addKeyword(actorId: string, word: string): MockResult<{ items: string[] }> {
  const s = state();
  if (s.keywords.some((stored) => stored.toLocaleLowerCase('vi') === word.toLocaleLowerCase('vi')))
    return conflict('Từ khóa đã có');
  s.keywords.push(word);
  logSetting(actorId, 'moderation.keyword.add', word, `Thêm từ khóa "${word}"`, 'moderation');
  return ok({ items: listKeywords() });
}

export function removeKeyword(actorId: string, word: string): MockResult<{ items: string[] }> {
  const s = state();
  const i = s.keywords.findIndex(
    (stored) => stored.toLocaleLowerCase('vi') === word.toLocaleLowerCase('vi'),
  );
  if (i < 0) return notFound('Không tìm thấy từ khóa');
  s.keywords.splice(i, 1);
  logSetting(actorId, 'moderation.keyword.remove', word, `Xóa từ khóa "${word}"`, 'moderation');
  return ok({ items: listKeywords() });
}
