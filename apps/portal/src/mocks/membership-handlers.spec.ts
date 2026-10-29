import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({ Authorization: `Bearer mock.${uid}` });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const json = async <T>(r: Response) => (await r.json()) as T;

describe('MSW G3a — phí thành viên, sự kiện, dịch vụ', () => {
  it('TK hết 3 tháng miễn phí (D-28, D-94 2A): hết hạn, chưa từng đóng, nội dung CK theo BR-04', async () => {
    const r = await fetch(`${BASE}/me/membership`, { headers: as('m6') });
    const b = await json<{
      status: string;
      neverPaid: boolean;
      transferContent: string;
      bank: { accountNo: string };
    }>(r);
    expect(b.status).toBe('expired');
    expect(b.neverPaid).toBe(true);
    expect(b.transferContent).toBe('OPCHUB TV000006 0935210987');
    expect(b.bank.accountNo).toBe('1203132809');
  });

  it('D-31: xác nhận CK → 202 chờ webhook; webhook giả về trễ mới kích hoạt', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const miss = await fetch(`${BASE}/me/membership/transfer-confirm`, {
        method: 'POST',
        headers: as('m6'),
      });
      expect(miss.status).toBe(400);
      const r = await fetch(`${BASE}/me/membership/transfer-confirm`, {
        method: 'POST',
        headers: { ...as('m6'), 'Idempotency-Key': 'k1' },
      });
      expect(r.status).toBe(202);
      expect(await json<{ awaitingWebhook: boolean }>(r)).toMatchObject({ awaitingWebhook: true });
      const before = await json<{ status: string }>(
        await fetch(`${BASE}/me/membership`, { headers: as('m6') }),
      );
      expect(before.status).toBe('expired');
      vi.advanceTimersByTime(2200);
      const after = await json<{ status: string; validUntil: string }>(
        await fetch(`${BASE}/me/membership`, { headers: as('m6') }),
      );
      expect(after.status).toBe('active');
      expect(after.validUntil).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('đăng ký sự kiện → thông báo nhắc trong hộp thư', async () => {
    const r = await fetch(`${BASE}/events/e1/registration`, { method: 'POST', headers: as('m1') });
    expect(r.status).toBe(201);
    const n = await json<{ items: { title: string; link: string }[] }>(
      await fetch(`${BASE}/notifications?size=50`, { headers: as('m1') }),
    );
    expect(n.items[0]).toMatchObject({ link: '/events/e1' });
    expect(n.items[0]?.title).toMatch(/^Đã đăng ký: OPC Meetup #12/);
  });

  it('e2 đã gồm lượt đăng ký sẵn của TK demo (144/200); hết chỗ → 409', async () => {
    const b = await json<{ items: { id: string; registered: number; registeredByMe: boolean }[] }>(
      await fetch(`${BASE}/events?size=100`, { headers: as('m1') }),
    );
    expect(b.items.find((e) => e.id === 'e2')).toMatchObject({
      registered: 144,
      registeredByMe: true,
    });
    const full = await fetch(`${BASE}/events/e4/registration`, {
      method: 'POST',
      headers: as('m1'),
    });
    expect(full.status).toBe(409);
  });

  it('điền sẵn form tư vấn từ hồ sơ', async () => {
    const b = await json<{ accountType: string; business: { taxCode: string } | null }>(
      await fetch(`${BASE}/me`, { headers: as('m1') }),
    );
    expect(b).toMatchObject({ accountType: 'business', business: { taxCode: '0101234567' } });
  });
});
