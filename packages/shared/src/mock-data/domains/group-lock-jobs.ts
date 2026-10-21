import type { AdminAccountRow } from '../../api-domains';
import type { GroupMemberStatus } from '../../enums';
import { listMockAdminAccounts } from './admin-rbac';
import { groupAdminExt, groupAdminState } from './group-admin-state';
import { logSetting } from './settings-log';
import { mockDb } from './store';
import type { MockDb } from './store-types';

const queues = new WeakMap<MockDb, Set<string>>();
function pending() {
  const db = mockDb();
  let value = queues.get(db);
  if (!value) {
    value = new Set();
    queues.set(db, value);
  }
  return value;
}
export function oldestMockSuperAdmin(rows: AdminAccountRow[]): string | null {
  return (
    rows
      .filter((row) => row.status === 'active' && row.isSuperAdmin)
      .sort(
        (a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0]?.id ?? null
  );
}
export const enqueueMockGroupOwnerLock = (userId: string) => pending().add(userId);
export const pendingMockGroupOwnerLocks = () => pending().size;

/** Outbox worker: failed selection keeps the batch pending; stale unlock is a no-op. */
export function drainMockGroupOwnerLocks(
  resolveAdmin = () => oldestMockSuperAdmin(listMockAdminAccounts()),
): number {
  const queue = pending();
  if (!queue.size) return 0;
  const adminId = resolveAdmin();
  if (!adminId) throw new Error('Không có Super Admin đang hoạt động để nhận nhóm của TK bị khoá');
  const db = mockDb();
  const staff = groupAdminState();
  const locked = new Set([...queue].filter((id) => db.userStatus.get(id) === 'locked'));
  let moved = 0;
  for (const group of db.groups) {
    const ext = groupAdminExt(group.id);
    const from = ext.ownerId;
    if (!locked.has(from) || db.groupMembers.get(from)?.get(group.id) !== 'member') continue;
    ext.ownerId = adminId;
    ext.lecturerIds = ext.lecturerIds.filter((id) => id !== from && id !== adminId);
    staff.roles.set(`${group.id}:${from}`, 'member');
    const adminGroups = db.groupMembers.get(adminId) ?? new Map<string, GroupMemberStatus>();
    if (adminGroups.get(group.id) !== 'member') group.memberCount++;
    adminGroups.set(group.id, 'member');
    db.groupMembers.set(adminId, adminGroups);
    logSetting(
      null,
      'group.owner_transfer',
      group.id,
      `Chuyển chủ nhóm ${group.name} về Admin (TK bị khoá)`,
      'member',
      { from, to: adminId, reason: 'locked' },
    );
    moved++;
  }
  queue.clear();
  return moved;
}

export function currentMockGroupOwner(groupId: string): string | null {
  drainMockGroupOwnerLocks();
  return mockDb().groups.some((row) => row.id === groupId)
    ? groupAdminExt(groupId).ownerId || null
    : null;
}
