import { beforeEach, describe, expect, it } from 'vitest';
import { directorMemberPageSchema, directorHistorySchema } from '../../../api-domains';
import { mockDb, resetMockDb } from '../store';
import { readMockDirectors, mockDirectorCandidates, readMockDirectorHistory } from './read';
import { mockDirectorState } from './state';
import { appointMockDirector } from './write';
import { arrangeEmptyDirectors } from './empty.fixture';

beforeEach(() => {
  resetMockDb();
  arrangeEmptyDirectors();
});

describe('REQ-616 MSW director read models', () => {
  it('AT-GDV06 searches accents, email and code, pages newest-first and excludes locks/incumbents', () => {
    const query = { q: 'bao', page: 1, size: 1 };
    expect(directorMemberPageSchema.parse(mockDirectorCandidates(query))).toMatchObject({
      total: 1,
      items: [{ id: 'm3' }],
    });
    const code = mockDb().fees.find((fee) => fee.userId === 'm3')?.memberCode;
    if (!code) throw new Error('Missing member code');
    expect(mockDirectorCandidates({ ...query, q: code }).items[0]?.id).toBe('m3');
    expect(mockDirectorCandidates({ ...query, q: '@', page: 100 }).items).toEqual([]);
    mockDb().userStatus.set('m3', 'locked');
    expect(mockDirectorCandidates(query).total).toBe(0);
    mockDb().userStatus.set('m3', 'active');
    expect(appointMockDirector('admin', { region: 'north', userId: 'm3', version: 1 }).ok).toBe(
      true,
    );
    expect(mockDirectorCandidates(query).total).toBe(0);
  });

  it('D-121 counts each affiliate once using current province membership, not industry memberships', () => {
    const db = mockDb();
    const north = db.groups.find(
      (group) => group.kind === 'province' && group.province === 'Hà Nội',
    );
    const south = db.groups.find(
      (group) => group.kind === 'province' && group.province === 'TP. Hồ Chí Minh',
    );
    if (!north || !south) throw new Error('Missing province fixtures');
    db.groupMembers.clear();
    db.groupMembers.set(
      'm3',
      new Map([
        [north.id, 'member'],
        [south.id, 'member'],
      ]),
    );
    expect(readMockDirectors().slots.map((slot) => slot.affiliateCount)).toEqual([1, 0, 0]);
    db.groupMembers.set(
      'm3',
      new Map([
        [north.id, 'left'],
        [south.id, 'member'],
      ]),
    );
    expect(readMockDirectors().slots.map((slot) => slot.affiliateCount)).toEqual([0, 0, 1]);
  });

  it('AT-GDV07 keyset pages equal timestamps by descending id and filters regions', () => {
    const at = '2026-10-30T03:00:00.000Z';
    mockDirectorState().history = [1, 2, 3].map((n) => ({
      id: `019a3310-0000-7000-8000-00000000000${n}`,
      region: n === 2 ? 'south' : 'north',
      action: 'updated',
      memberName: null,
      actorName: 'Admin',
      actorRole: 'Quản trị viên',
      at,
      summary: 'Cập nhật',
    }));
    const first = directorHistorySchema.parse(readMockDirectorHistory({ size: 2 }));
    expect(first.items.map((row) => row.id.at(-1))).toEqual(['3', '2']);
    expect(first.nextCursor).toEqual({ at, id: first.items[1]?.id });
    if (!first.nextCursor) throw new Error('Missing history cursor');
    const second = readMockDirectorHistory({
      size: 2,
      beforeAt: at,
      beforeId: first.nextCursor.id,
    });
    expect(second.items.map((row) => row.id.at(-1))).toEqual(['1']);
    expect(second.nextCursor).toBeNull();
    expect(
      readMockDirectorHistory({ size: 2, region: 'north' }).items.map((row) => row.id.at(-1)),
    ).toEqual(['3', '1']);
    first.items.splice(0);
    expect(mockDirectorState().history).toHaveLength(3);
  });
});
