import { resetMockDb } from '@opchub/shared/mock-domains';
import {
  feeBulkCollectResponseSchema,
  feeExportResponseSchema,
  feeSummarySchema,
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
    expect(s).toMatchObject({ total: 8, paid: 6, pending_payment: 1, expiring: 1, expired: 1 });
    expect(s.revenue).toBe(3_600_000);
    expect(Number.isInteger(s.revenue)).toBe(true);
  });

  it('ghi nhận đã thu hàng loạt → cập nhật thống kê', async () => {
    const r = await post('/admin/fees/collect', { userIds: ['m4', 'm6', 'm6'] });
    expect(feeBulkCollectResponseSchema.parse(await r.json()).updated).toBe(2);
    const s = await summary();
    expect(s.pending_payment).toBe(0);
    expect(s.expired).toBe(0);
    expect(s.paid).toBe(8);
    expect((await post('/admin/fees/collect', { userIds: [] })).status).toBe(400);
  });

  it('nhắc tất cả chưa hiệu lực; xuất CSV có BOM + tiêu đề', async () => {
    const all = await post('/admin/fees/remind-all');
    expect(all.status).toBe(202);
    expect(((await all.json()) as { queued: number }).queued).toBe(3);
    const ex = feeExportResponseSchema.parse(
      await (await post('/admin/fees/export', { userIds: ['m6'] })).json(),
    );
    expect(ex.filename).toBe('phi-thanh-vien.csv');
    expect(ex.csv.charCodeAt(0)).toBe(0xfeff);
    expect(ex.csv.slice(1).startsWith('Thành viên,Email')).toBe(true);
    expect(ex.csv).toContain('"Đỗ Hải Yến","yen.do@brandkit.vn","Cá nhân","11/06/2026"');
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
