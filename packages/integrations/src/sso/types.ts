/** Danh tính provider OAuth trả về sau callback (D-45: email đã được provider xác thực) */
export interface SsoIdentity {
  subject: string;
  email: string;
  fullName: string;
}

/** Nút SSO trên Portal (trùng `SSO_IDS` của shared) */
export type SsoButton = 'google' | 'facebook' | 'linkedin' | 'chatgpt' | 'gemini' | 'deepseek';
/** Luồng OAuth thật: lưu DB + nằm trong redirect path. D-64: chatgpt/gemini/deepseek → google */
export type SsoFlow = 'google' | 'facebook' | 'linkedin';

export interface SsoAuthorizeRequest {
  redirectUri: string;
  state: string;
  nonce: string;
  /** PKCE S256 */
  codeChallenge: string;
}

export interface SsoExchangeRequest {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  nonce: string;
}

/** D-64: Google thật qua OIDC; dev/test dùng fake. Provider khác thêm qua cùng interface */
export interface SsoProvider {
  readonly name: string;
  /** Nút này đi được với provider đang cấu hình không */
  supports(button: SsoButton): boolean;
  flowOf(button: SsoButton): SsoFlow;
  /** URL chuyển hướng tới trang đăng nhập của provider */
  authorizeUrl(flow: SsoFlow, req: SsoAuthorizeRequest): string;
  /** Đổi `code` lấy danh tính đã xác minh; code/token sai → null */
  exchange(flow: SsoFlow, req: SsoExchangeRequest): Promise<SsoIdentity | null>;
}

const VIA_GOOGLE: readonly SsoButton[] = ['google', 'chatgpt', 'gemini', 'deepseek'];

/** D-64: ChatGPT/Gemini/DeepSeek là nút đăng nhập bằng tài khoản Google */
export const ssoFlowOf = (button: SsoButton): SsoFlow =>
  VIA_GOOGLE.includes(button) ? 'google' : (button as SsoFlow);
