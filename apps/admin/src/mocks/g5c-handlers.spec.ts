import { auditLog, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const get = async <T>(path: string) => (await fetch(`${BASE}${path}`)).json() as Promise<T>;
const send = (path: string, method: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

interface Page<T> {
  items: T[];
  total: number;
}
interface Inv {
  key: string;
  name: string;
  status: string;
  totalAmount: number;
  items: unknown[];
}

describe('MSW G5c — nhà đầu tư', () => {
  it('gộp theo người, thống kê như prototype', async () => {
    const s = await get<Record<string, number>>('/admin/investors/summary');
    expect(s).toEqual({
      total: 4,
      fund: 2,
      business: 1,
      individual: 1,
      totalAmount: 1_750_000_000,
    });
    const p = await get<Page<Inv>>('/admin/investors?q=somchai');
    expect(p.items[0]).toMatchObject({ totalAmount: 350_000_000 });
    expect(p.items[0]?.items).toHaveLength(2);
  });

  it('bình luận đầu tiên → Đang trao đổi; đổi trạng thái ghi audit', async () => {
    const [mai] = (await get<Page<Inv>>('/admin/investors?q=Sao%20Mai')).items;
    expect(mai?.status).toBe('sent');
    const key = encodeURIComponent(mai?.key ?? '');
    const c = await send(`/admin/investors/${key}/comments`, 'POST', { body: 'Chào chị' });
    expect(c.status).toBe(201);
    expect((await get<Inv>(`/admin/investors/${key}`)).status).toBe('in_discussion');
    const r = await send(`/admin/investors/${key}/status`, 'PATCH', { status: 'connected' });
    expect(((await r.json()) as Inv).status).toBe('connected');
    expect(auditLog().map((a) => a.action)).toContain('investor.status');
  });

  it('xuất CSV theo bộ lọc + audit', async () => {
    const r = await send('/admin/investors/export', 'POST', { kind: 'fund' });
    const f = (await r.json()) as { filename: string; csv: string };
    expect(f.filename).toBe('nha-dau-tu.csv');
    expect(f.csv.trim().split('\n')).toHaveLength(3);
    expect(auditLog()[0]?.action).toBe('investor.export');
  });
});

describe('MSW G5c — dịch vụ', () => {
  it('chuyển trạng thái chỉ theo máy trạng thái, có điều kiện', async () => {
    const tr = (from: string, to: string) =>
      send('/admin/service-requests/YC-1005/transition', 'POST', { from, to });
    expect((await tr('new', 'won')).status).toBe(409);
    expect((await tr('consulting', 'quoted')).status).toBe(409);
    expect((await tr('new', 'lost')).status).toBe(200);
    expect((await tr('lost', 'consulting')).status).toBe(200);
    const s = await get<{ byStatus: Record<string, number> }>('/admin/service-requests/summary');
    expect(s.byStatus).toMatchObject({ new: 0, consulting: 2, lost: 0 });
    expect(auditLog()[0]?.detail).toBe('lost->consulting');
  });

  it('tìm theo email; bình luận có gắn tên', async () => {
    const p = await get<Page<{ code: string }>>('/admin/service-requests?q=ueh.edu');
    expect(p.items.map((x) => x.code)).toEqual(['YC-1003']);
    const c = await send('/admin/service-requests/YC-1003/comments', 'POST', {
      body: '<p>Ok</p>',
      mentions: ['Phạm Thu Hà'],
    });
    expect(c.status).toBe(201);
    const list = await get<{ items: { mentions: string[] }[] }>(
      '/admin/service-requests/YC-1003/comments',
    );
    expect(list.items).toHaveLength(2);
    expect(list.items[1]?.mentions).toEqual(['Phạm Thu Hà']);
  });

  it('danh mục: xoá dịch vụ đã có YC → 409, chưa có → xoá + audit', async () => {
    expect((await send('/admin/services/ai30', 'DELETE')).status).toBe(409);
    expect((await send('/admin/services/b2b', 'DELETE')).status).toBe(200);
    const l = await get<{ items: { id: string; requestCount: number }[] }>('/admin/services');
    expect(l.items.map((x) => x.id)).not.toContain('b2b');
    expect(l.items.find((x) => x.id === 'ai30')?.requestCount).toBe(1);
    expect(auditLog()[0]?.action).toBe('service.delete');
  });
});
