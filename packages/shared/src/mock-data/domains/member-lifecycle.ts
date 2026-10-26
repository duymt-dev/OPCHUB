import type { UserStatus } from '../../enums';
import { members } from '../../fixtures';
import { mockDb } from './store';
import type { MockDb } from './store-types';
import { logSetting } from './settings-log';
import { revokeMockMemberSessions } from './member-sessions';
import { enqueueMockGroupOwnerLock } from './group-lock-jobs';
import { conflict, notFound, ok, type MockResult } from './util';

const reasons = new WeakMap<MockDb, Map<string, string | null>>();
function lockReasons() {
  const db = mockDb();
  let value = reasons.get(db);
  if (!value) {
    value = new Map();
    reasons.set(db, value);
  }
  return value;
}
export const mockMemberLockReason = (userId: string) => lockReasons().get(userId) ?? null;

/** V4-612 (D-77): hạn + loại khoá — null `until` = không thời hạn; mở khoá thì xoá */
export interface MockLock {
  until: number | null;
  kind: 'manual' | 'auto';
}
const lockInfo = new WeakMap<MockDb, Map<string, MockLock>>();
export function mockLocks(): Map<string, MockLock> {
  const db = mockDb();
  let value = lockInfo.get(db);
  if (!value) {
    // Prototype seed: m4 khoá thủ công không thời hạn
    value = new Map([['m4', { until: null, kind: 'manual' }]]);
    lockInfo.set(db, value);
  }
  return value;
}

/** Only real transitions revoke sessions and emit account audit. */
export function setMockMemberStatus(
  userId: string,
  status: UserStatus,
  actorId = 'admin',
  reason: string | null = null,
  lock: MockLock = { until: null, kind: 'manual' },
): MockResult<{ id: string; status: UserStatus }> {
  const db = mockDb();
  const current = db.userStatus.get(userId);
  if (!current) return notFound('Không tìm thấy thành viên');
  if (current === status) return conflict('Tài khoản đã ở trạng thái này');
  db.userStatus.set(userId, status);
  lockReasons().set(userId, reason);
  if (status === 'locked') mockLocks().set(userId, lock);
  else mockLocks().delete(userId);
  revokeMockMemberSessions(userId);
  if (status === 'locked') enqueueMockGroupOwnerLock(userId);
  const name =
    members.find((row) => row.id === userId)?.name ??
    db.fees.find((row) => row.userId === userId)?.fullName ??
    userId;
  logSetting(
    actorId,
    status === 'locked' ? 'user.lock' : 'user.unlock',
    userId,
    `${status === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${name}`,
    'member',
    reason ? { reason } : undefined,
  );
  return ok({ id: userId, status });
}

export function setMockMembersStatus(
  userIds: string[],
  status: UserStatus,
  actorId = 'admin',
  reason: string | null = null,
  days?: number,
) {
  const until = days ? Date.now() + days * 86_400_000 : null;
  let updated = 0;
  for (const id of new Set(userIds))
    if (setMockMemberStatus(id, status, actorId, reason, { until, kind: 'manual' }).ok) updated++;
  return ok({ updated });
}
