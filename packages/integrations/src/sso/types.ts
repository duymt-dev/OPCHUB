/** Danh tính provider OAuth trả về sau callback (D-45: email đã được provider xác thực) */
export interface SsoIdentity {
  subject: string;
  email: string;
  fullName: string;
}

/** OQ-04: chưa có client ID thật → dev/test dùng fake; provider thật thêm sau qua cùng interface */
export interface SsoProvider {
  readonly name: string;
  /** URL chuyển hướng tới trang đăng nhập của provider */
  authorizeUrl(provider: string, redirectUri: string, state: string): string;
  /** Đổi `code` lấy danh tính; code sai → null */
  exchange(provider: string, code: string, redirectUri: string): Promise<SsoIdentity | null>;
}
