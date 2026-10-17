import type { SsoIdentity, SsoProvider } from './types';

const DEFAULT_EMAIL = 'sso.member@gmail.com';
const DEFAULT_NAME = 'Thành viên SSO';

/**
 * Dev/test: không gọi provider thật. Trang "đăng nhập" là chính callback của Portal.
 * `code` có dạng email → dùng email đó (test nhiều tài khoản); khác → email mặc định như MSW.
 */
export class FakeSsoProvider implements SsoProvider {
  readonly name = 'fake';

  authorizeUrl(provider: string, redirectUri: string, state: string): string {
    const u = new URL(redirectUri);
    u.searchParams.set('provider', provider);
    u.searchParams.set('code', 'mock');
    u.searchParams.set('state', state);
    return u.toString();
  }

  exchange(provider: string, code: string): Promise<SsoIdentity | null> {
    if (!code) return Promise.resolve(null);
    const email = code.includes('@') ? code.toLowerCase() : DEFAULT_EMAIL;
    return Promise.resolve({
      subject: `${provider}:${email}`,
      email,
      fullName: code.includes('@') ? (email.split('@')[0] ?? DEFAULT_NAME) : DEFAULT_NAME,
    });
  }
}
