import {
  ssoFlowOf,
  type SsoAuthorizeRequest,
  type SsoButton,
  type SsoExchangeRequest,
  type SsoFlow,
  type SsoIdentity,
  type SsoProvider,
} from './types';

const DEFAULT_EMAIL = 'sso.member@gmail.com';
const DEFAULT_NAME = 'Thành viên SSO';

/**
 * CHỈ dev/test (env cấm ở production, D-64): không gọi provider thật, trang "đăng nhập" là chính
 * callback của Portal. `code` có dạng email → dùng email đó (test nhiều tài khoản); khác → email
 * mặc định như MSW. Không kiểm nonce/PKCE.
 */
export class FakeSsoProvider implements SsoProvider {
  readonly name = 'fake';

  supports(): boolean {
    return true;
  }

  flowOf(button: SsoButton): SsoFlow {
    return ssoFlowOf(button);
  }

  authorizeUrl(_flow: SsoFlow, req: SsoAuthorizeRequest): string {
    // BUG-034: provider nằm trong path của redirectUri (`/sso/callback/<flow>`) như provider thật
    const u = new URL(req.redirectUri);
    u.searchParams.set('code', 'mock');
    u.searchParams.set('state', req.state);
    return u.toString();
  }

  exchange(flow: SsoFlow, req: SsoExchangeRequest): Promise<SsoIdentity | null> {
    const { code } = req;
    if (!code) return Promise.resolve(null);
    const email = code.includes('@') ? code.toLowerCase() : DEFAULT_EMAIL;
    return Promise.resolve({
      subject: `${flow}:${email}`,
      email,
      fullName: code.includes('@') ? (email.split('@')[0] ?? DEFAULT_NAME) : DEFAULT_NAME,
    });
  }
}
