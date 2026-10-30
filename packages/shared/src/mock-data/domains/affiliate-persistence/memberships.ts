import type { GroupMemberStatus } from '../../../enums';
import { mockDb } from '../store';

type Memberships = Array<[string, Array<[string, GroupMemberStatus]>]>;

/** Province attribution belongs to the affiliate, not a revenue snapshot or a slot. */
export function captureAffiliateMemberships(owners: Iterable<string>): Memberships {
  const db = mockDb();
  return [...owners].map((id) => [id, [...(db.groupMembers.get(id) ?? [])]]);
}

export function restoreAffiliateMemberships(
  rows: Memberships | undefined,
  previousOwners: Iterable<string>,
): void {
  if (!rows) return; // Legacy snapshots did not own membership state.
  const db = mockDb();
  const touched = new Set([...previousOwners, ...rows.map(([id]) => id)]);
  const deltas = new Map<string, number>();
  const count = (groups: Iterable<[string, GroupMemberStatus]>, sign: number) => {
    for (const [id, status] of groups)
      if (status === 'member') deltas.set(id, (deltas.get(id) ?? 0) + sign);
  };
  for (const id of touched) {
    count(db.groupMembers.get(id) ?? [], -1);
    db.groupMembers.delete(id);
  }
  for (const [id, groups] of rows) {
    db.groupMembers.set(id, new Map(groups));
    count(groups, 1);
  }
  for (const group of db.groups) group.memberCount += deltas.get(group.id) ?? 0;
}
