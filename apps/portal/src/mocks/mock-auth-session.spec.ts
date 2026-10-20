import { loginResponseSchema } from '@opchub/shared/api';
import { mockLogin } from '@opchub/shared/mock-data';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  mockRefreshHandlers,
  mockSessionResponse,
  clearMockSession,
} from './handlers/mock-auth-session';

const server = setupServer(...mockRefreshHandlers);
beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => clearMockSession());

describe('MSW refresh for native-equivalent reload behavior', () => {
  it('REQ-311 F5 khôi phục đúng người dùng, không lưu access token trong cookie', async () => {
    const login = mockLogin('an.nguyen@mediasoft.vn', 'User@2026');
    if (!login.ok) throw new Error('Missing demo member');
    mockSessionResponse(login.me);
    expect(document.cookie).not.toContain('accessToken');
    expect(document.cookie).not.toContain('mock.m1');
    const response = await fetch(`${location.origin}/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: document.cookie },
    });
    expect(response.status).toBe(200);
    expect(loginResponseSchema.parse(await response.json()).me.id).toBe('m1');
  });
  it('REQ-311 logout hoặc cookie hỏng không phục hồi thành người dùng mặc định', async () => {
    clearMockSession();
    for (const cookie of ['', 'opchub-msw-session=broken']) {
      const response = await fetch(`${location.origin}/v1/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });
      expect(response.status).toBe(401);
    }
  });
});
