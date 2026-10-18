import { resetMockDb, signUnsubscribeToken, suppressions } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const post = (token: string) =>
  fetch(`${BASE}/public/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

describe('MSW portal — huỷ nhận email (BUG-036)', () => {
  it('BUG-036 GET email che; POST 2 lần 200, 1 dòng; token sửa → 400', async () => {
    const token = await signUnsubscribeToken('an.nguyen@mediasoft.vn');
    const info = await fetch(`${BASE}/public/unsubscribe?token=${token}`);
    expect(await info.json()).toEqual({ email: 'an***@mediasoft.vn' });
    expect((await post(token)).status).toBe(200);
    expect((await post(token)).status).toBe(200);
    expect(suppressions().size).toBe(1);
    const bad = `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`;
    const r = await post(bad);
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: { message: string } }).error.message).toBe(
      'Liên kết huỷ đăng ký không hợp lệ',
    );
    expect((await fetch(`${BASE}/public/unsubscribe?token=x`)).status).toBe(400);
  });
});
