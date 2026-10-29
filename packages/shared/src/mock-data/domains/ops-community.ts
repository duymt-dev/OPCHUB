import type {
  GroupItem,
  GroupUpsert,
  JoinResult,
  Message,
  Report,
  ReportMessageRequest,
} from '../../api-domains';
import type { GroupMemberStatus } from '../../enums';
import { members, regionOf } from '../../fixtures';
import { recordLive } from './live-feed';
import { rememberMockReportSource } from './report-context';
import {
  hideAndCountMock,
  sweepMockExpiredLocks,
  withMockViolations,
} from './moderation-violations';
import { mockDb, nextId } from './store';
import {
  conflict,
  cursorSlice,
  includesText,
  iso,
  MOCK_NOW,
  notFound,
  ok,
  type MockResult,
} from './util';

/** Nghiệp vụ mock: nhóm, phòng chat, báo cáo vi phạm */

export interface GroupFilter {
  q?: string | undefined;
  region?: string | undefined;
}

export function listGroups(userId: string | null, f: GroupFilter): GroupItem[] {
  const db = mockDb();
  const mine = userId ? db.groupMembers.get(userId) : undefined;
  return db.groups
    .filter((g) => !f.region || g.region === f.region)
    .filter((g) => includesText(g.name, f.q) || includesText(g.province, f.q))
    .map((g) => ({ ...g, myStatus: mine?.get(g.id) ?? null }));
}

export function joinGroup(userId: string, groupId: string): MockResult<JoinResult> {
  const db = mockDb();
  const g = db.groups.find((x) => x.id === groupId);
  if (!g) return notFound('Không tìm thấy nhóm');
  const mine = db.groupMembers.get(userId) ?? new Map<string, GroupMemberStatus>();
  db.groupMembers.set(userId, mine);
  if (mine.get(groupId) === 'member') return conflict('Bạn đã tham gia nhóm này');
  // D-71: đã đóng phí (paywall chặn trước) → vào nhóm ngay, không chờ duyệt
  mine.set(groupId, 'member');
  g.memberCount += 1;
  const who =
    members.find((m) => m.id === userId)?.name ??
    db.fees.find((f) => f.userId === userId)?.fullName ??
    userId;
  recordLive({
    memberName: who,
    avatarUrl: null,
    kind: 'join',
    target: g.name,
    at: iso(Date.now()),
  });
  return ok({ groupId, status: 'member' });
}

/** NA-18 như server: lúc kích hoạt TK đăng ký, mọi nhóm đã chọn vào ngay (D-71) */
export function joinOnRegister(userId: string, groupIds: readonly string[]): void {
  const db = mockDb();
  const mine = db.groupMembers.get(userId) ?? new Map<string, GroupMemberStatus>();
  db.groupMembers.set(userId, mine);
  for (const gid of groupIds) {
    const g = db.groups.find((x) => x.id === gid);
    if (!g || mine.get(gid) === 'member') continue;
    mine.set(gid, 'member');
    g.memberCount += 1;
  }
}

export function leaveGroup(userId: string, groupId: string): MockResult<JoinResult> {
  const db = mockDb();
  const mine = db.groupMembers.get(userId);
  if (mine?.get(groupId) !== 'member') return notFound('Bạn chưa tham gia nhóm');
  mine.set(groupId, 'left');
  const g = db.groups.find((x) => x.id === groupId);
  if (g) g.memberCount = Math.max(0, g.memberCount - 1);
  return ok({ groupId, status: 'left' });
}

export function upsertGroup(input: GroupUpsert, id?: string): MockResult<GroupItem> {
  const db = mockDb();
  const base = { ...input, region: regionOf(input.province) };
  if (id) {
    const g = db.groups.find((x) => x.id === id);
    if (!g) return notFound('Không tìm thấy nhóm');
    Object.assign(g, base);
    return ok({ ...g, myStatus: null });
  }
  if (db.groups.some((g) => g.name === input.name)) return conflict('Tên nhóm đã tồn tại');
  const g = {
    id: nextId('c'),
    kind: 'province' as const,
    industry: null,
    parentId: null,
    memberCount: 0,
    weeklyActive: 0,
    coverUrl: null,
    avatars: [],
    ...base,
  };
  db.groups.push(g);
  db.rooms.push({
    id: `${g.id}-general`,
    groupId: g.id,
    name: 'Chung',
    description: 'Phòng mặc định của nhóm',
    isDefault: true,
  });
  return ok({ ...g, myStatus: null });
}

export function deleteGroup(id: string): MockResult<{ id: string }> {
  const db = mockDb();
  const i = db.groups.findIndex((g) => g.id === id);
  if (i < 0) return notFound('Không tìm thấy nhóm');
  db.groups.splice(i, 1);
  return ok({ id });
}

export const listRooms = (groupId: string) => mockDb().rooms.filter((r) => r.groupId === groupId);

/** Tin nhắn mới → cũ, cursor `before` = id tin cũ nhất đã có */
export function listMessages(
  roomId: string,
  q: string | undefined,
  before: string | undefined,
  size: number,
) {
  const db = mockDb();
  if (!db.rooms.some((r) => r.id === roomId)) return notFound('Không tìm thấy phòng');
  const all = [...(db.messages.get(roomId) ?? [])]
    .reverse()
    .filter((m) => includesText(m.body, q) || includesText(m.attachment?.name ?? '', q));
  return ok(cursorSlice(all, before, size));
}

function findMessage(id: string): Message | undefined {
  for (const list of mockDb().messages.values()) {
    const m = list.find((x) => x.id === id);
    if (m) return m;
  }
  return undefined;
}

export function reportMessage(messageId: string, input: ReportMessageRequest): MockResult<Report> {
  const db = mockDb();
  const m = findMessage(messageId);
  if (!m) return notFound('Không tìm thấy tin nhắn');
  const room = db.rooms.find((r) => r.id === m.roomId);
  const group = db.groups.find((g) => g.id === room?.groupId);
  const r: Report = {
    id: nextId('r'),
    senderName: m.sender.name,
    groupName: group?.name ?? '',
    body: m.body,
    hit: m.body.slice(0, 40),
    reason: input.reason,
    source: 'report',
    reporterCount: 1,
    status: 'open',
    createdAt: iso(MOCK_NOW),
    violations: 0,
    senderLocked: false,
    lockedUntil: null,
    canLock: false,
  };
  db.reportMessageIds.set(r.id, messageId);
  rememberMockReportSource(r.id, m);
  db.reports.unshift(r);
  // V4-612 (D-77): báo cáo → ẩn ngay + tính vi phạm
  hideAndCountMock(r.id);
  return ok(Object.assign(r, withMockViolations(r)));
}

export function listReports(source?: Report['source'], status?: Report['status']) {
  sweepMockExpiredLocks();
  return mockDb()
    .reports.filter((r) => (!source || r.source === source) && (!status || r.status === status))
    .map((r) => withMockViolations(r));
}

export function getReport(id: string): MockResult<Report> {
  const r = mockDb().reports.find((x) => x.id === id);
  return r ? ok(withMockViolations(r)) : notFound('Không tìm thấy báo cáo');
}

export { actOnMockReport as actOnReport } from './report-actions';
