import type {
  DefaultRoomKey,
  ExtraRoom,
  GroupAdminUpsert,
  GroupDetail,
  GroupMemberRow,
  GroupMembersExport,
} from '../../api-domains';
import { members } from '../../fixtures';
import { deleteGroup, upsertGroup } from './ops-community';
import { mockDb, nextId, type MockDb } from './store';
import { conflict, iso, isoFromVnDate, MOCK_NOW, notFound, ok, type MockResult } from './util';

/**
 * Phần mở rộng CSDL giả cho màn Admin "Nhóm cộng đồng" (G4c): chủ nhóm, giảng viên,
 * phòng mặc định, nội quy, ảnh bìa, từ khóa kiểm duyệt, nhật ký audit. WeakMap theo MockDb
 * nên `resetMockDb()` tự dựng lại.
 */

interface GroupExt {
  ownerId: string;
  lecturerIds: string[];
  roomKeys: DefaultRoomKey[];
  extraRooms: ExtraRoom[];
  rules: string[];
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  target: string;
  detail: string;
  at: string;
}

interface GroupAdminState {
  ext: Map<string, GroupExt>;
  keywords: string[];
  audit: AuditEntry[];
  /** GR-R01: vai trò gán từ màn Thành viên, khoá `<groupId>:<userId>` (prototype `grpRoles`) */
  roles: Map<string, 'lecturer' | 'member'>;
}

/** Nội quy mặc định của prototype */
export const DEFAULT_RULES = [
  'Tôn trọng thành viên, không công kích cá nhân',
  'Không spam, quảng cáo khi chưa được phép',
  'Không chia sẻ thông tin cá nhân nhạy cảm của người khác',
];
const DEFAULT_ROOMS: DefaultRoomKey[] = ['general', 'qa', 'docs'];
/** Từ khóa seed của prototype (state.keywords) */
const KEYWORD_SEED = [
  'chuyển khoản trước',
  'bán tài khoản',
  'số CCCD',
  'mật khẩu',
  'đồ ngu',
  'kiếm tiền nhanh',
  'vay nóng',
];
/** Chủ nhóm mẫu của prototype: c1, c6 → TK demo; còn lại → Lê Minh Anh */
const SEED_OWNERS: Record<string, string> = { c1: 'm1', c6: 'm1' };

const defaultExt = (groupId: string): GroupExt => ({
  ownerId: SEED_OWNERS[groupId] ?? 'm2',
  lecturerIds: [],
  roomKeys: [...DEFAULT_ROOMS],
  extraRooms: [],
  rules: [...DEFAULT_RULES],
});

const states = new WeakMap<MockDb, GroupAdminState>();

function state(): GroupAdminState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { ext: new Map(), keywords: [...KEYWORD_SEED], audit: [], roles: new Map() };
    states.set(db, s);
  }
  return s;
}

function extOf(groupId: string): GroupExt {
  const s = state();
  let e = s.ext.get(groupId);
  if (!e) {
    e = defaultExt(groupId);
    s.ext.set(groupId, e);
  }
  return e;
}

/** Luật 10: mọi thao tác ghi của admin vào audit_logs */
export function recordAudit(actorId: string, action: string, target: string, detail = '') {
  state().audit.unshift({ id: nextId('al'), actorId, action, target, detail, at: iso(MOCK_NOW) });
}
export const auditLog = (): AuditEntry[] => state().audit;

export function getGroupDetail(id: string): MockResult<GroupDetail> {
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
  const ext = extFrom(input, extOf(gid));
  state().ext.set(gid, ext);
  const g = mockDb().groups.find((x) => x.id === gid);
  // BUG-011: ảnh bìa nằm trên dòng nhóm → Portal / rail chat / lưới Admin cùng thấy
  if (g) g.coverUrl = input.coverUrl;
  // Chủ nhóm + giảng viên là thành viên đầu tiên của nhóm mới (prototype: 1 + số giảng viên)
  if (g && !id) g.memberCount = 1 + ext.lecturerIds.length;
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
  if (s.keywords.includes(word)) return conflict('Từ khóa đã có');
  s.keywords.push(word);
  recordAudit(actorId, 'moderation.keyword.add', word);
  return ok({ items: listKeywords() });
}

export function removeKeyword(actorId: string, word: string): MockResult<{ items: string[] }> {
  const s = state();
  const i = s.keywords.indexOf(word);
  if (i < 0) return notFound('Không tìm thấy từ khóa');
  s.keywords.splice(i, 1);
  recordAudit(actorId, 'moderation.keyword.remove', word);
  return ok({ items: listKeywords() });
}
