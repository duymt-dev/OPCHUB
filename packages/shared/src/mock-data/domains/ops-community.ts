import type {
  GroupItem,
  GroupUpsert,
  JoinResult,
  Message,
  Report,
  ReportAction,
  ReportMessageRequest,
} from '../../api-domains';
import type { GroupMemberStatus } from '../../enums';
import { members, regionOf } from '../../fixtures';
import { recordLive } from './live-feed';
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

export function joinGroup(userId: string, groupId: string, intro?: string): MockResult<JoinResult> {
  const db = mockDb();
  const g = db.groups.find((x) => x.id === groupId);
  if (!g) return notFound('Không tìm thấy nhóm');
  const mine = db.groupMembers.get(userId) ?? new Map<string, GroupMemberStatus>();
  db.groupMembers.set(userId, mine);
  const cur = mine.get(groupId);
  if (cur === 'member' || cur === 'pending') return conflict('Bạn đã tham gia hoặc đang chờ duyệt');
  if (g.joinMode === 'approval' && !intro) return conflict('Nhóm này cần lời giới thiệu để duyệt');
  const status = g.joinMode === 'approval' ? 'pending' : 'member';
  mine.set(groupId, status);
  if (status === 'member') {
    g.memberCount += 1;
    const who = members.find((m) => m.id === userId)?.name ?? userId;
    recordLive({
      memberName: who,
      avatarUrl: null,
      kind: 'join',
      target: g.name,
      at: iso(Date.now()),
    });
  }
  return ok({ groupId, status });
}

/**
 * NA-18 như server: lúc kích hoạt TK đăng ký, nhóm mở vào ngay (`member`), nhóm cần duyệt ở
 * `pending` + yêu cầu cho chủ nhóm duyệt (intro rỗng).
 */
export function joinOnRegister(
  userId: string,
  fullName: string,
  groupIds: readonly string[],
): void {
  const db = mockDb();
  const mine = db.groupMembers.get(userId) ?? new Map<string, GroupMemberStatus>();
  db.groupMembers.set(userId, mine);
  for (const gid of groupIds) {
    const g = db.groups.find((x) => x.id === gid);
    if (!g || mine.has(gid)) continue;
    if (g.joinMode === 'open') {
      mine.set(gid, 'member');
      g.memberCount += 1;
      continue;
    }
    mine.set(gid, 'pending');
    db.joinRequests.push({
      userId,
      groupId: gid,
      fullName,
      avatarUrl: null,
      intro: '',
      requestedAt: iso(MOCK_NOW),
    });
  }
}

export function leaveGroup(userId: string, groupId: string): MockResult<JoinResult> {
  const mine = mockDb().groupMembers.get(userId);
  const cur = mine?.get(groupId);
  if (!mine || (cur !== 'member' && cur !== 'pending')) return notFound('Bạn chưa tham gia nhóm');
  const status = cur === 'pending' ? 'cancelled' : 'left';
  mine.set(groupId, status);
  return ok({ groupId, status });
}

export function decideJoin(
  groupId: string,
  userId: string,
  decision: 'approve' | 'reject',
): MockResult<JoinResult> {
  const db = mockDb();
  const idx = db.joinRequests.findIndex((r) => r.groupId === groupId && r.userId === userId);
  if (idx < 0) return notFound('Không tìm thấy yêu cầu');
  db.joinRequests.splice(idx, 1);
  const status = decision === 'approve' ? 'member' : 'rejected';
  const g = db.groups.find((x) => x.id === groupId);
  if (g && status === 'member') g.memberCount += 1;
  return ok({ groupId, status });
}

export const listJoinRequests = (groupId?: string) =>
  mockDb().joinRequests.filter((r) => !groupId || r.groupId === groupId);

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
  };
  db.reports.unshift(r);
  return ok(r);
}

export function listReports(source?: Report['source'], status?: Report['status']) {
  return mockDb().reports.filter(
    (r) => (!source || r.source === source) && (!status || r.status === status),
  );
}

export function getReport(id: string): MockResult<Report> {
  const r = mockDb().reports.find((x) => x.id === id);
  return r ? ok(r) : notFound('Không tìm thấy báo cáo');
}

/** Đổi trạng thái có điều kiện: chỉ `open` → `resolved` */
export function actOnReport(
  id: string,
  action: ReportAction,
): MockResult<Report & { action: ReportAction }> {
  const r = mockDb().reports.find((x) => x.id === id);
  if (!r) return notFound('Không tìm thấy báo cáo');
  if (r.status !== 'open') return conflict('Báo cáo đã được xử lý');
  r.status = 'resolved';
  return ok({ ...r, action });
}
