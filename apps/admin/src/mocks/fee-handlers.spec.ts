import { FUNDRAISING_BRIDGE_COOKIE, resetMockDb } from '@opchub/shared/mock-domains';
import {
  feeBulkCollectResponseSchema,
  feeExportResponseSchema,
  feeSummarySchema,
  pendingFundraisingListSchema,
  unmatchedTxnPageSchema,
} from '@opchub/shared/api-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const post = (path: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const summary = async () =>
  feeSummarySchema.parse(await (await fetch(`${BASE}/admin/fees/summary`)).json());

describe('MSW admin — Phí thành viên (Q-G4b-1)', () => {
  it('thống kê theo seed prototype; doanh thu là số nguyên VND', async () => {
    const s = await summary();
    // D-94 2A: m6 chưa từng đóng, quá 3 tháng miễn phí → hết hạn (prototype `fst`)
    expect(s).toMatchObject({
      total: 10,
      paid: 5,
      trial: 0,
      pending_payment: 0,
      expiring: 0,
      regional_director: 3,
      expired: 2,
    });
    // D-68: tổng phí theo gói của 6 TV đã đóng (DN 3.600.000, Cá nhân 1.200.000)
    expect(s.revenue).toBe(13_200_000);
    expect(Number.isInteger(s.revenue)).toBe(true);
  });

  it('ghi nhận đã thu hàng loạt → cập nhật thống kê', async () => {
    const r = await post('/admin/fees/collect', { userIds: ['m4', 'm6', 'm6'] });
    expect(feeBulkCollectResponseSchema.parse(await r.json()).updated).toBe(2);
    const s = await summary();
    expect(s.pending_payment).toBe(0);
    expect(s.expired).toBe(0);
    expect(s.paid).toBe(7);
    expect((await post('/admin/fees/collect', { userIds: [] })).status).toBe(400);
  });

  it('D-63 nhắc tất cả chưa hiệu lực (bỏ TK khoá như server); xuất CSV có BOM + tiêu đề', async () => {
    const all = await post('/admin/fees/remind-all');
    expect(all.status).toBe(202);
    expect(((await all.json()) as { queued: number }).queued).toBe(1);
    const ex = feeExportResponseSchema.parse(
      await (await post('/admin/fees/export', { userIds: ['m6'] })).json(),
    );
    expect(ex.filename).toBe('phi-thanh-vien.csv');
    expect(ex.csv.charCodeAt(0)).toBe(0xfeff);
    expect(ex.csv.slice(1).startsWith('Thành viên,Email')).toBe(true);
    expect(ex.csv).toContain('"Đỗ Hải Yến","yen.do@brandkit.vn","Cá nhân","11/06/2026"');
  });

  it('BUG-014 MSW giao dịch không khớp + khớp tay 409 lần 2', async () => {
    const list = async (qs = '') =>
      unmatchedTxnPageSchema.parse(
        await (await fetch(`${BASE}/admin/fees/transactions${qs}`)).json(),
      );
    const first = await list('?size=2');
    expect(first.items.map((x) => x.id)).toEqual(['ptx-901', 'ptx-902']);
    expect(first.items[1]).toMatchObject({ amount: 500_000, matchedHint: 'TV000006' });
    expect(first.nextBefore).not.toBeNull();
    const next = await list(`?size=3&before=${encodeURIComponent(first.nextBefore ?? '')}`);
    expect(next.items.map((x) => x.id)).toEqual(['ptx-903', 'ptx-904']);
    expect(next.nextBefore).toBeNull();

    const path = '/admin/fees/transactions/ptx-901/match';
    expect((await post(path, { userId: 'm6', reason: '' })).status).toBe(400);
    expect((await post(path, { userId: 'm6', reason: 'Khách gọi xác nhận' })).status).toBe(204);
    expect((await list()).items.map((x) => x.id)).not.toContain('ptx-901');
    expect((await summary()).pending_payment).toBe(0);
    const again = await post(path, { userId: 'm6', reason: 'Khách gọi xác nhận' });
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: { code: string } }).error.code).toBe('CONFLICT');
  });

  it('D-113 F3 MSW khớp tay vào Gói Gọi vốn chờ thanh toán → chờ thẩm định; lần 2 → 409', async () => {
    // Khoản do Portal tạo đến qua cookie bridge (cùng host)
    const row = {
      id: 'fr-t1',
      projectId: 'p10',
      ownerName: 'Nguyễn Văn An',
      code: 'GV000001',
      amount: 15_000_000,
      status: 'pending_payment',
      legacy: false,
      endsAt: null,
      createdAt: '2026-10-28T01:00:00.000Z',
    };
    // jsdom: handler đọc `document.cookie` (Portal và Admin cùng host)
    document.cookie = `${FUNDRAISING_BRIDGE_COOKIE}=${encodeURIComponent(JSON.stringify([row]))}`;
    const pending = async (q: string) =>
      pendingFundraisingListSchema.parse(
        await (await fetch(`${BASE}/admin/fees/fundraisings/pending?q=${q}`)).json(),
      );
    expect((await pending('gv000001')).items).toEqual([
      expect.objectContaining({ id: 'fr-t1', code: 'GV000001', ownerCode: 'TV000001' }),
    ]);
    const list = unmatchedTxnPageSchema.parse(
      await (await fetch(`${BASE}/admin/fees/transactions?size=10`)).json(),
    );
    expect(list.items.find((x) => x.id === 'ptx-904')).toMatchObject({
      fundraisingHint: 'GV000001',
    });
    const path = '/admin/fees/transactions/ptx-904/match';
    const body = { kind: 'fundraising', fundraisingId: 'fr-t1', reason: 'Khách thiếu Mã TV' };
    expect((await post(path, body)).status).toBe(204);
    expect((await pending('')).items).toEqual([]);
    expect((await post(path, body)).status).toBe(409);
    const other = await post('/admin/fees/transactions/ptx-901/match', body);
    expect(other.status).toBe(409);
    expect(((await other.json()) as { error: { message: string } }).error.message).toBe(
      'Gói Gọi vốn không còn chờ thanh toán',
    );
    document.cookie = `${FUNDRAISING_BRIDGE_COOKIE}=; Max-Age=0`;
  });

  it('BUG-024 cookie giả lập 409 → thông điệp server (V2Q-78)', async () => {
    const res = await fetch(`${BASE}/admin/fees/u-yen/collect`, {
      method: 'POST',
      headers: { cookie: 'opchub-mock-fee-conflict=1' },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error).toMatchObject({
      code: 'CONFLICT',
      message: 'Phí vừa được cập nhật bởi thao tác khác',
    });
  });
});
