import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
/** Handler dùng path tương đối → khớp theo origin của jsdom */
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

const login = (identifier: string, password: string) =>
  fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

describe('MSW auth', () => {
  it('đăng nhập admin demo', async () => {
    const res = await login('admin@opchub.community', 'Admin@2026');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { me: { systemRole: string } };
    expect(body.me.systemRole).toBe('super_admin');
  });

  it('sai mật khẩu → 401 UNAUTHORIZED', async () => {
    const res = await login('admin@opchub.community', 'x');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('thiếu trường → 400', async () => {
    expect((await login('', '')).status).toBe(400);
  });
});

describe('MSW lists', () => {
  it('phân trang thành viên size 10', async () => {
    const res = await fetch(`${BASE}/admin/users?page=1`);
    const body = (await res.json()) as { items: unknown[]; size: number; total: number };
    expect(body.size).toBe(10);
    expect(body.items.length).toBeLessThanOrEqual(10);
    expect(body.total).toBeGreaterThan(0);
  });

  it('trang vượt quá trả items rỗng', async () => {
    const res = await fetch(`${BASE}/groups?page=999`);
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBeGreaterThan(0);
  });
});
