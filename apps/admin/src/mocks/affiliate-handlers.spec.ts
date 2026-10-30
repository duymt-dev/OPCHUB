import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import {
  affiliateAdminCustomersSchema,
  affiliateAdminPageSchema,
  affiliateCommissionsSchema,
  affiliateDetailSchema,
  affiliateMonthsSchema,
  affiliatePayoutResultSchema,
  affiliateSummarySchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { newMemberMe } from '@opchub/shared/mock-data';
import {
  affiliateMockState,
  attachMockAffiliate,
  checkMockAffiliate,
  feeAction,
  listSettingsLog,
  mockAffiliateBank,
  mockAffiliateReferrals,
  myMockAffiliate,
  resetMockDb,
  seedMockAffiliateScenario,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const PAGE = { page: 1, size: 100 };
const BANK = { bankName: 'BIDV', bankNo: '135792468', bankHolder: 'NGUYEN VAN AN' } as const;
const request = (path: string, method = 'GET', body?: unknown, actor = 'admin', key?: string) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
      'Content-Type': 'application/json',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const commissions = async (query = '') =>
  affiliateCommissionsSchema.parse(
    await (await request(`/admin/affiliate/commissions?size=100${query}`)).json(),
  );

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-01T03:00:00Z'));
  document.cookie = 'opchub-mock-affiliate-demo=; Max-Age=0; Path=/';
  document.cookie = 'opchub-mock-affiliate-paused=; Max-Age=0; Path=/';
  resetMockDb();
  seedMockAffiliateScenario();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('TIP-V2-404 Affiliate Admin MSW contract', () => {
  it('REQ-312 pages real AF0 data, filters search/status and returns backend-owned totals', async () => {
    const all = await commissions();
    expect(all.total).toBe(51);
    const agents = affiliateAdminPageSchema.parse(
      await (await request('/admin/affiliates?size=100')).json(),
    );
    // D-94 3A: mọi TV (64 trong gói AF0) là đại lý
    expect(agents.total).toBe(66);
    const filtered = await commissions('&q=Le%20Thu%20Ha&status=recorded');
    expect(filtered.items.length).toBeGreaterThan(0);
    expect(
      filtered.items.every((row) => row.affiliateName === 'Lê Thu Hà' && row.status === 'recorded'),
    ).toBe(true);
    const summary = affiliateSummarySchema.parse(
      await (await request('/admin/affiliate/summary')).json(),
    );
    expect(summary.paid).toBe(
      all.items.filter((r) => r.status === 'paid').reduce((n, r) => n + r.amount, 0),
    );
    const empty = affiliateSummarySchema.parse(
      await (await request('/admin/affiliate/summary?month=2099-12')).json(),
    );
    // BR-AFF-REV (TIP-V42-707): tóm tắt có số khoản theo gói
    expect(empty).toEqual({
      revenue: 0,
      totalCommission: 0,
      payable: 0,
      paid: 0,
      netRevenue: 0,
      plans: { business: 0, personal: 0, fundraising: 0 },
    });
    const detail = affiliateDetailSchema.parse(
      await (await request('/admin/affiliates/m1')).json(),
    );
    expect(detail.code).toBe('OPCAN26');
    expect(
      affiliateMonthsSchema.parse(await (await request('/admin/affiliates/m1/months')).json())
        .total,
    ).toBe(3);
    expect(
      affiliateAdminCustomersSchema.parse(
        await (await request('/admin/affiliates/m1/customers')).json(),
      ).total,
    ).toBe(9);
  });

  it('REQ-310 cancellation requires reason, is atomic on unknown ids and exposes the reason in Portal', async () => {
    const all = await commissions();
    const row = all.items.find((r) => r.status === 'recorded')!;
    expect(
      (await request('/admin/affiliate/commissions/cancel', 'POST', { ids: [row.id], reason: ' ' }))
        .status,
    ).toBe(400);
    expect(
      (
        await request('/admin/affiliate/commissions/cancel', 'POST', {
          ids: [row.id, 'missing'],
          reason: 'Lý do',
        })
      ).status,
    ).toBe(404);
    expect((await commissions()).items.find((r) => r.id === row.id)?.status).toBe('recorded');
    expect(
      await (
        await request('/admin/affiliate/commissions/cancel', 'POST', {
          ids: [row.id, row.id],
          reason: 'Vi phạm điều khoản',
        })
      ).json(),
    ).toEqual({ cancelled: 1 });
    expect(
      mockAffiliateReferrals(row.affiliateId, PAGE).items.find((r) => r.id === row.id),
    ).toMatchObject({ status: 'cancelled', cancelReason: 'Vi phạm điều khoản' });
    expect(
      await (
        await request('/admin/affiliate/commissions/cancel', 'POST', {
          ids: [row.id],
          reason: 'Lý do khác',
        })
      ).json(),
    ).toEqual({ cancelled: 0 });
    expect(
      mockAffiliateReferrals(row.affiliateId, PAGE).items.find((r) => r.id === row.id)
        ?.cancelReason,
    ).toBe('Vi phạm điều khoản');
  });

  it('REQ-308 rate validates 1–50 and changes recorded only, leaving paid/cancelled immutable', async () => {
    const before = await commissions();
    expect((await request('/admin/affiliates/rate', 'PUT', { ids: ['m1'], rate: 51 })).status).toBe(
      400,
    );
    expect(
      (await request('/admin/affiliates/rate', 'PUT', { ids: ['m1', 'missing'], rate: 30 })).status,
    ).toBe(404);
    expect(await (await request('/admin/affiliates/m1', 'PATCH', { rate: 30 })).json()).toEqual({
      updated: 1,
    });
    const after = await commissions();
    for (const row of before.items) {
      const updated = after.items.find((r) => r.id === row.id)!;
      if (row.affiliateId === 'm1' && row.status === 'recorded')
        // D-110: 30% × phí thực trả của khoản (gói thực trả), làm tròn đến đồng
        expect(updated).toMatchObject({ rate: 30, amount: Math.round(row.feeAmount * 0.3) });
      else expect(updated).toEqual(row);
    }
  });

  it('AT-AF06 missing bank is 409 without financial/audit effects; retry keeps one receipt and old snapshots', async () => {
    const agent = affiliateMockState().agents.get('m1')!;
    agent.bank = null;
    const before = await commissions();
    const logs = listSettingsLog().length;
    const pay = () =>
      request(
        '/admin/affiliates/m1/payouts',
        'POST',
        { monthKey: '2026-10' },
        'admin',
        'same-intent',
      );
    expect((await pay()).status).toBe(409);
    expect((await commissions()).items).toEqual(before.items);
    expect(listSettingsLog()).toHaveLength(logs);
    mockAffiliateBank('m1', BANK);
    const paid = affiliatePayoutResultSchema.parse(await (await pay()).json());
    // D-110: c1 DN 720.000 + c2, c3 Cá nhân 240.000 (prototype v4.2 P-97 1.200.000đ)
    expect(paid).toEqual({ paid: 3, amount: 1200000 });
    expect(await (await pay()).json()).toEqual(paid);
    expect(listSettingsLog()).toHaveLength(logs + 1);
    const history = affiliateAdminCustomersSchema.parse(
      await (await request('/admin/affiliates/m1/customers?size=100')).json(),
    );
    expect(
      history.items
        .filter((r) => r.date.startsWith('2026-10'))
        .every((r) => r.bank?.bankName === 'BIDV'),
    ).toBe(true);
    expect(
      history.items
        .filter((r) => !r.date.startsWith('2026-10'))
        .every((r) => r.bank?.bankName === 'Vietcombank'),
    ).toBe(true);
  });

  it('D-110 expired agent stays active; payout pays ended months, blocks current/future', async () => {
    resetMockDb();
    seedMockAffiliateScenario({ paused: true });
    const id = 'af-owner-a3';
    expect(myMockAffiliate(id, '').state).toBe('active');
    expect(
      (
        await request(
          `/admin/affiliates/${id}/payouts`,
          'POST',
          { monthKey: '2026-11' },
          'admin',
          'future',
        )
      ).status,
    ).toBe(409);
    const ended = await request(
      `/admin/affiliates/${id}/payouts`,
      'POST',
      { monthKey: '2026-10' },
      'admin',
      'ended',
    );
    expect(ended.status).toBe(200);
    expect(((await ended.json()) as { paid: number }).paid).toBeGreaterThan(0);
  });

  it('REQ-308 REQ-303 policy updates cookie TTL/new agents, not rates of existing agents; reset drops state', async () => {
    expect(
      (
        await request('/admin/affiliate/policy', 'PUT', {
          defaultRate: 0,
          cookieDays: 30,
          fundraisingRate: 10,
          terms: '',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request('/admin/affiliate/policy', 'PUT', {
          defaultRate: 30,
          cookieDays: 45,
          fundraisingRate: 10,
          terms: 'Điều khoản',
        })
      ).status,
    ).toBe(200);
    expect(checkMockAffiliate('OPCAN26')).toMatchObject({ valid: true, cookieDays: 45 });
    expect(myMockAffiliate('m1', '').policy.rate).toBe(20);
    // D-94 3A: m6 đã là đại lý từ trước (chính sách cũ 20%) — đổi chính sách không đổi đại lý cũ
    expect(myMockAffiliate('m6', '').policy.rate).toBe(20);
    // TV đăng ký sau khi đổi chính sách → đại lý mới theo % mới
    const fresh = newMemberMe('policy-new@example.test', 'Thành Viên Mới');
    attachMockAffiliate(fresh);
    expect(myMockAffiliate(fresh.id, '').policy).toMatchObject({
      rate: 30,
      perAmount: 360000, // D-70: 30% × Gói Cá nhân 1.200.000 (Q-V4-602-3)
      cookieDays: 45,
    });
    feeAction('m6', 'collect', Date.now());
    feeAction('m6', 'renew', Date.now());
    expect((await commissions()).total).toBe(51);
    resetMockDb();
    expect(await (await request('/admin/affiliate/policy')).json()).toMatchObject({
      defaultRate: 20,
      cookieDays: 30,
    });
  });

  it('REQ-312 permissions reject missing auth/editor writes and reserve payout for its own key', async () => {
    expect((await request('/admin/affiliate/summary', 'GET', undefined, '')).status).toBe(401);
    expect((await request('/admin/affiliate/summary', 'GET', undefined, 'adm-hang')).status).toBe(
      403,
    );
    expect((await request('/admin/affiliate/summary', 'GET', undefined, 'adm-mai')).status).toBe(
      200,
    );
    expect(
      (
        await request(
          '/admin/affiliates/m1/payouts',
          'POST',
          { monthKey: '2026-10' },
          'adm-trang',
          'denied',
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          '/admin/affiliates/m1/payouts',
          'POST',
          { monthKey: '2026-10' },
          'adm-mai',
          'allowed',
        )
      ).status,
    ).toBe(200);
  });

  it('REQ-310 CSV validates ids, neutralizes formula injection and writes the native audit action', async () => {
    const ref = [...affiliateMockState().referrals.values()][0]!;
    ref.row.name = ' =HYPERLINK("bad")';
    expect(
      (await request('/admin/affiliate/commissions/export', 'POST', { ids: ['missing'] })).status,
    ).toBe(404);
    const file = csvFileSchema.parse(
      await (
        await request('/admin/affiliate/commissions/export', 'POST', { ids: [ref.row.id] })
      ).json(),
    );
    expect(file.csv.charCodeAt(0)).toBe(0xfeff);
    expect(file.csv).toContain("' =HYPERLINK");
    expect(listSettingsLog()[0]).toMatchObject({
      tag: 'affiliate',
      summary: 'Xuất CSV 1 dòng commissions',
    });
  });
});
