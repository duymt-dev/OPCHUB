import type { NeedMatches } from '../../api-domains/needs';
import { selectNeedMatches } from '../../needs/need-match';
import { mockNeeds } from './needs-store';
import { mockStores, visibleMockStores } from './stores';

/** Same two-stage candidate bound/scorer as server; no LLM or extra fixture state. */
export function myMockNeedMatches(userId: string, now = Date.now()): NeedMatches {
  const store = mockStores().find((row) => row.ownerId === userId);
  if (!store) return { hasStore: false, storeField: null, rows: [] };
  const result = { hasStore: true, storeField: store.field || null, rows: [] };
  if (store.status === 'hidden' || (!store.field && !store.province)) return result;
  const visible = new Set(visibleMockStores(now).map((row) => row.id));
  const candidates = mockNeeds()
    .filter(
      (row) =>
        row.status === 'open' &&
        visible.has(row.storeId) &&
        row.storeId !== store.id &&
        row.ownerId !== userId &&
        ((store.field && row.field === store.field) ||
          (store.province && row.province === store.province)),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 200);
  return {
    ...result,
    rows: selectNeedMatches(
      { ...store, productNames: store.items.map((item) => item.name) },
      candidates,
    ),
  };
}
