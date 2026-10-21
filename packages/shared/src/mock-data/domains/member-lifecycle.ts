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

/** Only real transitions revoke sessions and emit account audit. */
export function setMockMemberStatus(
  userId: string,
  status: UserStatus,
  actorId = 'admin',
  reason: string | null = null,
): MockResult<{ id: string; status: UserStatus }> {
  const db = mockDb();
  const current = db.userStatus.get(userId);
  if (!current) return notFound('Không tìm thấy thành viên');
  if (current === status) return conflict('Tài khoản đã ở trạng thái này');
  db.userStatus.set(userId, status);
  lockReasons().set(userId, reason);
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
) {
  let updated = 0;
  for (const id of new Set(userIds))
    if (setMockMemberStatus(id, status, actorId, reason).ok) updated++;
  return ok({ updated });
}
