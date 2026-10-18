import { Injectable } from '@nestjs/common';
import { maskEmail, UNSUBSCRIBE_INVALID } from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UnsubscribeToken } from '@/modules/mail';

const invalid = () =>
  new AppError('VALIDATION_ERROR', UNSUBSCRIBE_INVALID, [
    { path: 'token', message: UNSUBSCRIBE_INVALID },
  ]);

/**
 * BUG-036 (NĐ 13/2023 — rút lại đồng ý): huỷ nhận thư chiến dịch qua link trong thư. Token ký
 * HMAC (UnsubscribeToken), không lưu DB. Chỉ chặn thư `campaign`; thư giao dịch vẫn gửi.
 * Không log email / token thô.
 */
@Injectable()
export class UnsubscribeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly token: UnsubscribeToken,
  ) {}

  /** GET: email đã che để người nhận biết đúng địa chỉ của mình */
  info(token: string): { email: string } {
    return { email: maskEmail(this.emailOf(token)) };
  }

  /** POST: ghi `mail_suppressions` (idempotent — `ON CONFLICT DO NOTHING`) */
  async unsubscribe(token: string): Promise<{ email: string; unsubscribed: true }> {
    const email = this.emailOf(token);
    await this.prisma.db.$executeRaw`
      INSERT INTO mail_suppressions (email, reason) VALUES (${email}, 'unsubscribe')
      ON CONFLICT (email) DO NOTHING`;
    return { email: maskEmail(email), unsubscribed: true };
  }

  private emailOf(token: string): string {
    const email = this.token.verify(token);
    if (!email) throw invalid();
    return email;
  }
}
