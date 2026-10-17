import { Inject, Injectable } from '@nestjs/common';
import { type MailProvider, SmtpMailProvider } from '@opchub/integrations';
import { ENV, type Env } from '@/common/config';
import { SecretBox } from '@/common/crypto/secret-box';
import { MAIL } from '@/common/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface MailRoute {
  provider: MailProvider;
  from: { name: string; email: string };
  replyTo?: string;
  /** Hạn mức thư/ngày (giờ VN) — chỉ khi gửi qua cấu hình SMTP trong DB */
  dailyLimit: number | null;
}

/** Đọc lại `smtp_configs` tối đa mỗi 30 giây (worker gửi nhiều thư liên tiếp) */
const CACHE_MS = 30_000;

/**
 * Chọn đường gửi cho worker (D-13): `MAIL_PROVIDER=smtp` + cấu hình Admin bật + có key →
 * SMTP dựng từ `smtp_configs` (key giải mã bằng SecretBox, không log). Còn lại → adapter mặc định
 * (fake ở dev/test, hoặc SMTP_* trong env).
 */
@Injectable()
export class SmtpTransport {
  private cached: { at: number; stamp: number; route: MailRoute | null } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    @Inject(MAIL) private readonly fallback: MailProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async resolve(now = Date.now()): Promise<MailRoute> {
    if (this.env.MAIL_PROVIDER !== 'smtp') return this.defaultRoute();
    if (!this.cached || now - this.cached.at > CACHE_MS) {
      this.cached = await this.load(now);
    }
    return this.cached.route ?? this.defaultRoute();
  }

  /** Admin vừa lưu cấu hình → lần gửi sau đọc lại */
  reset(): void {
    this.cached = null;
  }

  private async load(now: number): Promise<{ at: number; stamp: number; route: MailRoute | null }> {
    const row = await this.prisma.db.smtpConfig.findUnique({ where: { id: 1 } });
    if (!row?.enabled || !row.keyEnc || !row.username) return { at: now, stamp: 0, route: null };
    const stamp = row.updatedAt.getTime();
    if (this.cached?.stamp === stamp && this.cached.route) return { ...this.cached, at: now };
    const encryption =
      row.encryption === 'ssl' || row.encryption === 'none' ? row.encryption : 'tls';
    const provider = new SmtpMailProvider({
      host: row.host,
      port: row.port,
      encryption,
      username: row.username,
      password: this.box.open(row.keyEnc).toString('utf8'),
      fromName: row.fromName,
      fromEmail: row.fromEmail,
    });
    return {
      at: now,
      stamp,
      route: {
        provider,
        from: { name: row.fromName, email: row.fromEmail },
        replyTo: row.replyTo,
        dailyLimit: row.dailyLimit > 0 ? row.dailyLimit : null,
      },
    };
  }

  private defaultRoute(): MailRoute {
    return {
      provider: this.fallback,
      from: { name: this.env.MAIL_FROM_NAME, email: this.env.MAIL_FROM_EMAIL },
      dailyLimit: null,
    };
  }
}
