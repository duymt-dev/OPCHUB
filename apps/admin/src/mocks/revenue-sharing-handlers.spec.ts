import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { newMemberMe } from '@opchub/shared/mock-data';
import {
  revenueDashboardSchema,
  revenueLedgerSchema,
  revenueMonthsSchema,
  revenuePayoutSchema,
  revenuePayoutHistorySchema,
  revenueFormerSchema,
} from '@opchub/shared/api-domains';
import {
  attachMockAffiliate,
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
  feeAction,
  mockDb,
  resetMockDb,
  revokeMockDirector,
  readMockDirectors,
  setMockAdminStatus,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1/admin/affiliate/revenue`;
const call = (path: string, method = 'GET', body?: unknown, actor = 'admin', key = 'revenue-key') =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
      'Content-Type': 'application/json',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-01T03:00:00Z'));
  document.cookie = 'opchub-mock-affiliate-demo=; Max-Age=0; Path=/';
  resetMockDb();
  const g = mockDb().groups.find((r) => r.province === 'Hà Nội' && r.kind === 'province')!;
  mockDb().groupMembers.set('m1', new Map([[g.id, 'member']]));
  const c = newMemberMe('revenue-http@example.test', 'Receipt customer');
  attachMockAffiliate(c, 'OPCAN26');
  mockDb().fees.find((f) => f.userId === c.id)!.amount = 101;
  expect(feeAction(c.id, 'collect', Date.parse('2026-10-15T03:00:00Z')).ok).toBe(true);
  expect(feeAction(c.id, 'renew', Date.parse('2026-10-15T03:00:00Z')).ok).toBe(true);
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('REQ-617 MSW revenue HTTP contracts (not browser/native proof)', () => {
  it('reads dashboard, exact totals, tied ledger cursor, months and former beneficiary', async () => {
    const all = revenueDashboardSchema.parse(await (await call('/dashboard')).json());
    expect(all.stats).toMatchObject({ allocated: '102', received: '202', affiliateCount: '1' });
    const filtered = revenueDashboardSchema.parse(
      await (await call('/dashboard?q=missing')).json(),
    );
    expect(filtered.stats).toEqual(all.stats);
    expect(filtered.visible).toEqual({ ids: [], due: '0', paid: '0' });
    const first = revenueLedgerSchema.parse(await (await call('/m3/shares?size=1')).json());
    expect(first.items).toHaveLength(1);
    expect(first.items[0]?.customerName).toBe('Receipt customer');
    const cursor = first.nextCursor!;
    const second = revenueLedgerSchema.parse(
      await (
        await call(
          `/m3/shares?size=1&beforeAt=${encodeURIComponent(cursor.at)}&beforeId=${cursor.id}`,
        )
      ).json(),
    );
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
    expect(
      revenueMonthsSchema.parse(await (await call('/m3/months')).json()).items[0],
    ).toMatchObject({ monthKey: '2026-10', due: '102' });
    const slot = readMockDirectors().slots.find((r) => r.region === 'north')!;
    expect(revokeMockDirector('admin', 'north', { version: slot.version }).ok).toBe(true);
    expect(revenueFormerSchema.parse(await (await call('/former')).json()).items[0]).toMatchObject({
      directorId: 'm3',
      stats: { due: '102' },
      bank: slot.bank,
    });
  });
  it('pays once under concurrent requests, freezes bank/history and replays after JSON reload', async () => {
    const responses = await Promise.all([
      call('/m3/payouts', 'POST', { monthKey: '2026-10' }),
      call('/m3/payouts', 'POST', { monthKey: '2026-10' }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const receipt = revenuePayoutSchema.parse(await responses[0].json());
    expect(receipt).toMatchObject({ amount: '102', shareCount: 2, paidBy: 'admin' });
    expect(await responses[1].json()).toEqual(receipt);
    const wire: unknown = JSON.parse(JSON.stringify(captureMockAffiliateSnapshot()));
    resetMockDb();
    restoreMockAffiliateSnapshot(wire);
    expect(await (await call('/m3/payouts', 'POST', { monthKey: '2026-10' })).json()).toEqual(
      receipt,
    );
    expect(
      (await call('/m3/payouts', 'POST', { monthKey: '2026-10' }, 'admin', 'another-key')).status,
    ).toBe(409);
    const history = revenuePayoutHistorySchema.parse(
      await (await call('/payouts?directorId=m3')).json(),
    );
    expect(history.items).toEqual([receipt]);
    expect(
      revenueDashboardSchema.parse(await (await call('/dashboard')).json()).stats,
    ).toMatchObject({ paid: '102', due: '0' });
  });
  it('rejects missing/revoked session and absent permission before any financial mutation', async () => {
    expect((await call('/dashboard', 'GET', undefined, '')).status).toBe(401);
    expect((await call('/dashboard', 'GET', undefined, 'adm-trang')).status).toBe(200);
    const before = captureMockAffiliateSnapshot();
    expect((await call('/m3/payouts', 'POST', { monthKey: '2026-10' }, 'adm-trang')).status).toBe(
      403,
    );
    expect(captureMockAffiliateSnapshot()).toEqual(before);
    expect(setMockAdminStatus('admin', 'adm-mai', 'locked').ok).toBe(true);
    expect((await call('/dashboard', 'GET', undefined, 'adm-mai')).status).toBe(401);
  });
  it('returns 400/413/404/409 for invalid bodies/cursors, unknown director and open month', async () => {
    expect((await call('/m3/payouts', 'POST', '{')).status).toBe(400);
    expect((await call('/m3/payouts', 'POST', { monthKey: '2026-10' }, 'admin', '')).status).toBe(
      400,
    );
    expect((await call('/m3/payouts', 'POST', { monthKey: '2026-10', amount: 2 })).status).toBe(
      400,
    );
    expect((await call('/m3/payouts', 'POST', ' '.repeat(768 * 1024 + 1))).status).toBe(413);
    expect((await call('/unknown/payouts', 'POST', { monthKey: '2026-10' })).status).toBe(404);
    expect((await call('/unknown/balance')).status).toBe(404);
    expect((await call('/m3/shares?beforeAt=2026-10-15T03:00:00Z')).status).toBe(400);
    expect((await call('/m3/payouts', 'POST', { monthKey: '2026-11' })).status).toBe(409);
  });
});
