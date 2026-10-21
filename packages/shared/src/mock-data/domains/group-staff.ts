import type { GroupMemberStatus } from '../../enums';
import { groupAdminState, type GroupExt } from './group-admin-state';
import { mockDb } from './store';

/** Staff saved through Admin must have actual membership rows, like native setStaff. */
export function ensureMockGroupStaff(groupId: string, previous: GroupExt, next: GroupExt) {
  const db = mockDb();
  const group = db.groups.find((row) => row.id === groupId);
  const roles = groupAdminState().roles;
  if (previous.ownerId && previous.ownerId !== next.ownerId)
    roles.set(`${groupId}:${previous.ownerId}`, 'member');
  for (const id of new Set([next.ownerId, ...next.lecturerIds].filter(Boolean))) {
    const mine = db.groupMembers.get(id) ?? new Map<string, GroupMemberStatus>();
    if (mine.get(groupId) !== 'member' && group) group.memberCount++;
    mine.set(groupId, 'member');
    db.groupMembers.set(id, mine);
    if (id !== next.ownerId) roles.set(`${groupId}:${id}`, 'lecturer');
  }
}
