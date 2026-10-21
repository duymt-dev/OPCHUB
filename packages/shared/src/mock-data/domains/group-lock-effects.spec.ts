import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  auditLog,
  chatOverview,
  getGroupDetail,
  groupRoleOf,
  listSettingsLog,
  mockDb,
  ownerOfGroup,
  resetMockDb,
  setUserStatus,
} from './index';
import { groupAdminUpsertSchema } from '../../api-domains';
import { groupAdminExt } from './group-admin-state';
import {
  drainMockGroupOwnerLocks,
  oldestMockSuperAdmin,
  pendingMockGroupOwnerLocks,
} from './group-lock-jobs';
import { listMockAdminAccounts } from './admin-rbac';
import { saveGroup } from './group-admin';
import { setMockMembersStatus } from './member-lifecycle';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
const owner = (id: string) => {
  const result = getGroupDetail(id);
  if (!result.ok) throw new Error(result.message);
  return result.data.ownerId;
};

describe('D-55 NA-16 UAT-24 locked member ownership effects', () => {
  it('a locked owner transfers to active Super Admin while retaining ordinary group membership', () => {
    expect(owner('c1')).toBe('m1');
    setUserStatus('m1', 'locked');
    expect(owner('c1')).toBe('admin');
    expect(groupRoleOf('m1', 'c1')).toBe('member');
    expect(mockDb().groupMembers.get('m1')?.get('c1')).toBe('member');
    expect(mockDb().groupMembers.get('admin')?.get('c1')).toBe('member');
  });

  it('unlock never returns transferred groups to their former owner', () => {
    setUserStatus('m1', 'locked');
    owner('c1');
    setUserStatus('m1', 'active');
    expect(owner('c1')).toBe('admin');
    expect(owner('c6')).toBe('admin');
    expect(groupRoleOf('m1', 'c1')).toBe('member');
  });

  it('chat ownership flags and owner lookup use current ownership after lock/unlock, not prototype constants', () => {
    setUserStatus('m1', 'locked');
    owner('c1');
    setUserStatus('m1', 'active');
    expect(ownerOfGroup('c1')).toBe('admin');
    expect(chatOverview('m1').joined.find((row) => row.id === 'c1')?.isOwner).toBe(false);
  });

  it('transfers audit as system actor once per group and increment member counts only for new Admin membership', () => {
    const group = mockDb().groups.find((row) => row.id === 'c1');
    if (!group) throw new Error('Missing group');
    const before = group.memberCount;
    setUserStatus('m1', 'locked');
    owner('c1');
    owner('c1');
    const transfers = auditLog().filter((row) => row.action === 'group.owner_transfer');
    expect(transfers).toHaveLength(2);
    expect(transfers.every((row) => row.actorId === null)).toBe(true);
    expect(transfers.find((row) => row.target === 'c1')?.diff).toEqual({
      from: 'm1',
      to: 'admin',
      reason: 'locked',
    });
    expect(group.memberCount).toBe(before + 1);
    expect(listSettingsLog()[0]?.actorName).toBe('Hệ thống');
  });

  it('an unlock before worker consumption makes the stale lock event a no-op', () => {
    setUserStatus('m1', 'locked');
    expect(pendingMockGroupOwnerLocks()).toBe(1);
    setUserStatus('m1', 'active');
    expect(drainMockGroupOwnerLocks()).toBe(0);
    expect(pendingMockGroupOwnerLocks()).toBe(0);
    expect(owner('c1')).toBe('m1');
    expect(auditLog().filter((row) => row.action === 'group.owner_transfer')).toEqual([]);
  });

  it('existing Admin group membership is promoted without counting another member or sending notices', () => {
    const group = mockDb().groups.find((row) => row.id === 'c1');
    if (!group) throw new Error('Missing group');
    mockDb().groupMembers.set('admin', new Map([['c1', 'member']]));
    const count = group.memberCount;
    const notices = structuredClone([...mockDb().notifications]);
    setUserStatus('m1', 'locked');
    expect(drainMockGroupOwnerLocks()).toBe(2);
    expect(drainMockGroupOwnerLocks()).toBe(0);
    expect(group.memberCount).toBe(count);
    expect(groupRoleOf('admin', 'c1')).toBe('owner');
    expect([...mockDb().notifications]).toEqual(notices);
  });

  it('no available Super Admin preserves the pending batch and owner/count state until a successful retry', () => {
    const group = mockDb().groups.find((row) => row.id === 'c1');
    if (!group) throw new Error('Missing group');
    const count = group.memberCount;
    setUserStatus('m1', 'locked');
    expect(() => drainMockGroupOwnerLocks(() => null)).toThrow('Không có Super Admin');
    expect(pendingMockGroupOwnerLocks()).toBe(1);
    expect(groupAdminExt('c1').ownerId).toBe('m1');
    expect(group.memberCount).toBe(count);
    expect(auditLog().filter((row) => row.action === 'group.owner_transfer')).toEqual([]);
    expect(drainMockGroupOwnerLocks()).toBe(2);
    expect(owner('c1')).toBe('admin');
  });

  it('selection uses only active Super Admins ordered by creation time then ID', () => {
    const base = listMockAdminAccounts().find((row) => row.isSuperAdmin);
    if (!base) throw new Error('Missing Admin fixture');
    const rows = [
      { ...base, id: 'z', createdAt: '2020-01-01T00:00:00Z' },
      { ...base, id: 'a', createdAt: '2020-01-01T00:00:00Z' },
      { ...base, id: 'locked', status: 'locked' as const, createdAt: '2019-01-01T00:00:00Z' },
      { ...base, id: 'not-super', isSuperAdmin: false, createdAt: '2018-01-01T00:00:00Z' },
    ];
    expect(oldestMockSuperAdmin(rows)).toBe('a');
    expect(oldestMockSuperAdmin([])).toBeNull();
  });

  it('bulk locks transfer all and only actual owned groups, once each', () => {
    const before = mockDb()
      .groups.filter((row) => ['m1', 'm2'].includes(owner(row.id)))
      .map((row) => row.id);
    setMockMembersStatus(['m1', 'm2', 'm1'], 'locked');
    expect(pendingMockGroupOwnerLocks()).toBe(2);
    expect(drainMockGroupOwnerLocks()).toBe(before.length);
    expect(before.every((id) => owner(id) === 'admin')).toBe(true);
    expect(
      new Set(
        auditLog()
          .filter((row) => row.action === 'group.owner_transfer')
          .map((row) => row.target),
      ).size,
    ).toBe(before.length);
  });

  it('freshly saved groups have real staff memberships and participate in the same transfer worker', () => {
    const created = saveGroup(
      'admin',
      groupAdminUpsertSchema.parse({
        name: 'D55 new group',
        province: 'Huế',
        description: '',
        joinMode: 'open',
        ownerId: 'm1',
        lecturerIds: ['m3'],
      }),
    );
    if (!created.ok) throw new Error(created.message);
    expect(created.data.memberCount).toBe(2);
    expect(mockDb().groupMembers.get('m1')?.get(created.data.id)).toBe('member');
    setUserStatus('m1', 'locked');
    expect(owner(created.data.id)).toBe('admin');
    expect(groupRoleOf('m1', created.data.id)).toBe('member');
    expect(groupRoleOf('m3', created.data.id)).toBe('lecturer');
    expect(getGroupDetail(created.data.id)).toMatchObject({ data: { memberCount: 3 } });
  });

  it('initial owner provenance agrees with actual active seed membership across Admin and Chat', () => {
    for (const group of mockDb().groups) {
      const id = owner(group.id);
      expect(ownerOfGroup(group.id)).toBe(id || null);
      if (id) {
        expect(mockDb().groupMembers.get(id)?.get(group.id)).toBe('member');
        expect(mockDb().userStatus.get(id)).toBe('active');
        expect(groupRoleOf(id, group.id)).toBe('owner');
      }
    }
  });

  it('reset clears queued work and ownership overrides rather than transferring a new fixture', () => {
    setUserStatus('m1', 'locked');
    expect(pendingMockGroupOwnerLocks()).toBe(1);
    resetMockDb();
    expect(pendingMockGroupOwnerLocks()).toBe(0);
    expect(owner('c1')).toBe('m1');
    expect(auditLog()).toEqual([]);
  });
});
