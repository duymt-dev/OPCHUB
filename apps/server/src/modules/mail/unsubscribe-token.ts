import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV, type Env } from '@/common/config';

const TOKEN_RE = /^([A-Za-z0-9_-]+)\.([A-Fa-f0-9]{64})$/;

/**
 * BUG-036 (NĐ 13/2023): token huỷ nhận thư chiến dịch `base64url(email).HMAC_SHA256(secret,
 * 'unsub|' + email)` — không hết hạn, không lưu DB. Secret `UNSUBSCRIBE_SECRET` (bắt buộc
 * production); dev/test để trống → suy từ JWT_SECRET (V2Q-86).
 */
@Injectable()
export class UnsubscribeToken {
  private readonly secret: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.secret =
      env.UNSUBSCRIBE_SECRET ??
      createHmac('sha256', env.JWT_SECRET).update('opchub-unsubscribe').digest('hex');
  }

  sign(email: string): string {
    const e = email.trim().toLowerCase();
    return `${Buffer.from(e, 'utf8').toString('base64url')}.${this.mac(e)}`;
  }

  /** Email trong token khi chữ ký đúng; sai định dạng / sai chữ ký → null */
  verify(token: string): string | null {
    const m = TOKEN_RE.exec(token);
    if (!m?.[1] || !m[2]) return null;
    const email = Buffer.from(m[1], 'base64url').toString('utf8');
    if (!email.includes('@')) return null;
    const want = Buffer.from(this.mac(email), 'hex');
    const got = Buffer.from(m[2].toLowerCase(), 'hex');
    return want.length === got.length && timingSafeEqual(want, got) ? email : null;
  }

  /** Trang Portal xác nhận huỷ (chân thư) */
  pageUrl(email: string): string {
    return `${this.env.PORTAL_URL}/unsubscribe?token=${this.sign(email)}`;
  }

  /** RFC 8058 one-click: POST thẳng API (cùng origin Portal qua Nginx `/v1`) — V2Q-85 */
  oneClickUrl(email: string): string {
    return `${this.env.PORTAL_URL}/v1/public/unsubscribe?token=${this.sign(email)}`;
  }

  /** Header `List-Unsubscribe` + `List-Unsubscribe-Post` cho thư chiến dịch */
  headers(email: string): Record<string, string> {
    return {
      'List-Unsubscribe': `<${this.oneClickUrl(email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  private mac(email: string): string {
    return createHmac('sha256', this.secret).update(`unsub|${email}`).digest('hex');
  }
}
