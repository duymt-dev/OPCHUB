import { beforeEach, describe, expect, it } from 'vitest';
import { needMatchesSchema } from '../../api-domains/needs';
import { selectNeedMatches } from '../../needs/need-match';
import { myMockNeedMatches } from './need-matches';
import { mockNeeds } from './needs-store';
import { resetMockDb } from './store';
import { mockStores, visibleMockStores } from './stores';
import { MOCK_NOW } from './util';

beforeEach(() => resetMockDb());
describe('REQ-626 mock parity with production scorer', () => {
  it('same shared scorer and candidate visibility/bound as server', () => {
    const store = mockStores().find((s) => s.ownerId === 'm1');
    if (!store) throw new Error('missing business fixture');
    const pubs = new Set(visibleMockStores(MOCK_NOW).map((s) => s.id));
    const candidates = mockNeeds()
      .filter(
        (n) =>
          n.status === 'open' &&
          pubs.has(n.storeId) &&
          n.storeId !== store.id &&
          n.ownerId !== store.ownerId &&
          ((store.field && n.field === store.field) ||
            (store.province && n.province === store.province)),
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id))
      .slice(0, 200);
    const expected = selectNeedMatches(
      { ...store, productNames: store.items.map((i) => i.name) },
      candidates,
    );
    expect(myMockNeedMatches('m1', MOCK_NOW).rows).toEqual(expected);
    expect(
      needMatchesSchema.parse(myMockNeedMatches('m1', MOCK_NOW)).rows.length,
    ).toBeLessThanOrEqual(3);
  });
  it('no store returns false; hidden own store returns true empty', () => {
    expect(myMockNeedMatches('missing', MOCK_NOW)).toEqual({
      hasStore: false,
      storeField: null,
      rows: [],
    });
    const store = mockStores().find((s) => s.ownerId === 'm1');
    if (!store) throw new Error('missing fixture');
    store.status = 'hidden';
    expect(myMockNeedMatches('m1', MOCK_NOW)).toMatchObject({ hasStore: true, rows: [] });
  });
  it('draft own store still matches; hidden providers and own needs excluded', () => {
    const store = mockStores().find((s) => s.ownerId === 'm1');
    if (!store) throw new Error('missing fixture');
    const before = myMockNeedMatches('m1', MOCK_NOW);
    store.status = 'draft';
    expect(myMockNeedMatches('m1', MOCK_NOW)).toEqual(before);
    for (const other of mockStores()) if (other.id !== store.id) other.status = 'hidden';
    expect(myMockNeedMatches('m1', MOCK_NOW).rows).toEqual([]);
  });
});
