import {
  campaignListSchema,
  campaignSchema,
  mailJobSchema,
  marketingSummarySchema,
} from '@opchub/shared/api-domains';
import { auditLog, outboxJobs, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const call = (path: string, method = 'GET', body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe('MSW admin — Marketing (Q-G6b-1)', () => {
  it('thống kê + danh sách + ước tính', async () => {
    const s = marketingSummarySchema.parse(await (await call('/admin/marketing/summary')).json());
    expect(s.campaigns).toBe(4);
    const l = campaignListSchema.parse(await (await call('/admin/campaigns')).json());
    expect(l.items).toHaveLength(4);
    const e = await (await call('/admin/campaigns/estimate?audience=groups&groupIds=c1,c2')).json();
    expect(e).toEqual({ recipients: 1248 + 1532 });
  });

  it('tạo thiếu tiêu đề → 400; gửi ngay → 202 + outbox', async () => {
    const bad = await call('/admin/campaigns', 'POST', {
      name: 'X',
      subject: '',
      audience: 'all',
      mode: 'draft',
    });
    expect(bad.status).toBe(400);
    const r = await call('/admin/campaigns', 'POST', {
      name: 'X',
      subject: 'Y',
      audience: 'business',
      mode: 'send',
    });
    expect(r.status).toBe(202);
    expect(campaignSchema.parse(await r.json()).status).toBe('sending');
    expect(outboxJobs()).toHaveLength(1);
  });

  it('gửi ngay chiến dịch nháp 202, lần hai 409; xóa ghi audit', async () => {
    const r = await call('/admin/campaigns/cp4/send', 'POST');
    expect(r.status).toBe(202);
    expect(mailJobSchema.parse(await r.json()).status).toBe('queued');
    expect((await call('/admin/campaigns/cp4/send', 'POST')).status).toBe(409);
    expect((await call('/admin/campaigns/cp1', 'DELETE')).status).toBe(200);
    expect(auditLog()[0]).toMatchObject({ action: 'campaign.delete', target: 'cp1' });
  });

  it('nhật ký gửi + gửi lại 202', async () => {
    const log = await (await call('/admin/mail/log')).json();
    expect(log.total).toBe(2);
    expect((await call('/admin/mail/log/w1/resend', 'POST')).status).toBe(202);
    expect((await call('/admin/mail/log/zz/resend', 'POST')).status).toBe(404);
  });
});
