import { beforeEach, expect, it } from 'vitest';
import { myRegionAffiliateQuerySchema } from '../../api-domains';
import { mockLogin } from '../index';
import { resetMockDb } from './store';
import { regionalShareState } from './regional-share-state';
import { mockMyRegionAffiliateCsv, mockMyRegionAffiliatePage } from './my-region-affiliates';
import { mockMyRegion } from './my-region';
import { auditLog } from './audit-store';
import { seedMockAffiliateScenario } from './affiliate-demo';

let userId: string;
beforeEach(() => {
  resetMockDb();
  seedMockAffiliateScenario();
  const login = mockLogin('bao.tran@solobooks.vn', 'User@2026');
  if (!login.ok) throw new Error('Missing demo director');
  userId = login.me.id;
  mockMyRegion(userId);
  const state = regionalShareState(),
    row = state.rows.find((r) => r.directorUserId === userId);
  if (!row) throw new Error('Missing financial fixture');
  state.rows = Array.from({ length: 130 }, (_, i) => ({
    ...row,
    id: `tip821-${i}`,
    sourceId: `tip821-${i}`,
    affiliateId: `tip821-aff-${String(i).padStart(3, '0')}`,
    affiliateName: i === 0 ? '=FORMULA' : `Affiliate ${Math.floor(i / 3)}`,
  }));
});
it('SPEC16 MSW mirrors50/50/30 cursor paging with stable ties and the legacy first page', () => {
  const first = mockMyRegionAffiliatePage(userId, { limit: 50 });
  expect(first?.items).toHaveLength(50);
  expect(first?.more).toBe(80);
  const second = mockMyRegionAffiliatePage(
    userId,
    myRegionAffiliateQuerySchema.parse({ cursor: first?.nextCursor }),
  );
  expect(second?.items).toHaveLength(50);
  expect(second?.more).toBe(30);
  const third = mockMyRegionAffiliatePage(
    userId,
    myRegionAffiliateQuerySchema.parse({ cursor: second?.nextCursor }),
  );
  expect(third?.items).toHaveLength(30);
  expect(third?.nextCursor).toBeNull();
  expect(
    new Set(
      [...(first?.items ?? []), ...(second?.items ?? []), ...(third?.items ?? [])].map((r) => r.id),
    ).size,
  ).toBe(130);
  const legacy = mockMyRegion(userId);
  if (legacy.state !== 'director') throw new Error('Missing director');
  expect(legacy.affiliates).toEqual(first?.items);
  expect(legacy.more).toBe(80);
});
it('SPEC17 MSW CSV is BOM-prefixed, formula-safe, has no contact columns and records actual member actor', () => {
  const csv = mockMyRegionAffiliateCsv(userId);
  expect(csv?.charCodeAt(0)).toBe(0xfeff);
  expect(csv?.split('\n')).toHaveLength(131);
  expect(csv).toContain('"\'=FORMULA"');
  expect(csv).not.toMatch(/Email|SĐT|phone/);
  expect(auditLog()[0]).toMatchObject({
    actorId: userId,
    action: 'regional.affiliates.export',
    diff: { count: 130, truncated: false },
  });
});
it('SPEC16 ordinary members receive no regional rows or export', () => {
  expect(mockMyRegionAffiliatePage('m1', { limit: 50 })).toBeNull();
  expect(mockMyRegionAffiliateCsv('m1')).toBeNull();
});
