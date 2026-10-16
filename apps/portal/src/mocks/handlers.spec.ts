import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
/** Handler dùng path tương đối → khớp theo origin của jsdom */
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

describe('MSW portal', () => {
  it('đăng nhập thành viên demo', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'an.nguyen@mediasoft.vn', password: 'User@2026' }),
    });
    const body = (await res.json()) as {
      me: { fullName: string; membershipFee: { status: string } };
    };
    expect(body.me.fullName).toBe('Nguyễn Văn An');
    expect(body.me.membershipFee.status).toBe('active');
  });

  it('sự kiện size mặc định 9', async () => {
    const body = (await (await fetch(`${BASE}/events`)).json()) as { size: number };
    expect(body.size).toBe(9);
  });

  it('lọc nhóm theo tỉnh', async () => {
    const body = (await (await fetch(`${BASE}/groups?q=Hà Nội`)).json()) as {
      items: { province: string }[];
    };
    expect(body.items.every((g) => g.province.includes('Hà Nội'))).toBe(true);
  });
});
