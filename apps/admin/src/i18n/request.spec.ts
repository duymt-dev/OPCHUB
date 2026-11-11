import { describe, expect, it, vi, beforeEach } from 'vitest';
import requestConfig from './request';
import { messages } from './messages';

const mocks = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => (mocks.cookie === undefined ? undefined : { value: mocks.cookie }),
    }),
}));
vi.mock('next-intl/server', () => ({ getRequestConfig: (create: unknown) => create }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  mocks.cookie = undefined;
});
const config = () => requestConfig({ requestLocale: Promise.resolve(undefined) });

describe('D-141 AC824-01/04 request-scoped messages, no authOverrides', () => {
  it.each([undefined, 'xx', '../../en', '__proto__', 'constructor'])(
    'fails closed for cookie %s',
    async (cookie) => {
      mocks.cookie = cookie;
      const result = await config();
      expect(result.locale).toBe('vi');
      expect(result.timeZone).toBe('Asia/Ho_Chi_Minh');
      expect(result.messages).toBe(messages);
    },
  );

  it('loads the actual English auth, profile, overview and metadata catalogs, not a few login overrides', async () => {
    mocks.cookie = 'en-SG';
    const result = await config();
    expect(result.locale).toBe('en-SG');
    expect(result.messages).toMatchObject({
      auth: {
        login: { submit: 'Sign in' },
        twoFactor: { title: 'Set up two-factor authentication' },
      },
      common: { adminProfile: { title: 'My profile' } },
      overview: { title: 'Overview' },
      meta: { profile: 'My profile' },
    });
    expect(messages.auth.login.submit).toBe('Đăng nhập');
  });
});
