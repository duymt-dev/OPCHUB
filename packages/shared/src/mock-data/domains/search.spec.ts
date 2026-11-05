import { beforeEach, describe, expect, it } from 'vitest';
import { mockGlobalSearch } from './search';
import { resetMockDb } from './store';
import { mockStores } from './stores';
import { MOCK_NOW } from './util';

beforeEach(() => resetMockDb());
describe('BR-491 MSW search scope', () => {
  it('normalizes accents, treats wildcard symbols literally and caps groups', () => {
    expect(mockGlobalSearch('ca phe', 'm1', { now: MOCK_NOW })).toEqual(
      mockGlobalSearch('cà phê', 'm1', { now: MOCK_NOW }),
    );
    expect(mockGlobalSearch('%_', 'm1').groups).toEqual([]);
    expect(
      mockGlobalSearch('a', 'm1', { now: MOCK_NOW }).groups.every((g) => g.items.length <= 4),
    ).toBe(true);
  });
  it('omits members on Portal and groups for investors; filters Admin by permission', () => {
    expect(mockGlobalSearch('an', 'm1').groups.some((g) => g.kind === 'member')).toBe(false);
    expect(
      mockGlobalSearch('OPC', 'm1', { investor: true }).groups.some((g) => g.kind === 'group'),
    ).toBe(false);
    expect(mockGlobalSearch('MediaSoft', 'm1', { admin: true, permissions: [] }).groups).toEqual(
      [],
    );
    expect(
      mockGlobalSearch('TV000001', 'm1', { admin: true, permissions: ['members.view'] }).groups[0]
        ?.items[0]?.id,
    ).toBe('m1');
  });
  it('Admin sees hidden stores while Portal does not', () => {
    const store = mockStores()[0];
    if (!store) throw new Error('missing fixture');
    store.status = 'hidden';
    expect(
      mockGlobalSearch(store.name, 'm1', { now: MOCK_NOW }).groups.some((g) => g.kind === 'store'),
    ).toBe(false);
    expect(
      mockGlobalSearch(store.name, 'm1', { admin: true, permissions: ['stores.view'] }).groups[0]
        ?.items[0]?.sub,
    ).toContain('Đã ẩn');
  });
});
