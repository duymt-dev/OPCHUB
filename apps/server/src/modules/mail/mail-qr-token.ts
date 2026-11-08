import { Inject, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  mailQrPayloadSchema,
  mailQrTargetSchema,
  mailQrTokenSchema,
  type MailQrTarget,
} from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';

const TTL = 30 * 86_400_000;
@Injectable()
export class MailQrToken {
  private readonly secret: string;
  constructor(@Inject(ENV) private readonly env: Env) {
    this.secret =
      env.MAIL_QR_SECRET ??
      createHmac('sha256', env.JWT_SECRET).update('opchub-mail-qr').digest('hex');
  }
  sign(target: MailQrTarget, now = new Date()): string {
    const data = {
      ...mailQrTargetSchema.parse(target),
      at: now.getTime(),
      exp: now.getTime() + TTL,
    };
    const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
    return mailQrTokenSchema.parse(`${encoded}.${this.mac(encoded)}`);
  }
  verify(raw: string, now = new Date()) {
    const parsed = mailQrTokenSchema.safeParse(raw);
    if (!parsed.success) return null;
    const [encoded, signature] = parsed.data.split('.');
    if (!encoded || !signature) return null;
    const want = Buffer.from(this.mac(encoded), 'hex'),
      got = Buffer.from(signature, 'hex');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    try {
      const bytes = Buffer.from(encoded, 'base64url');
      if (bytes.toString('base64url') !== encoded) return null;
      const data = mailQrPayloadSchema.safeParse(JSON.parse(bytes.toString('utf8')));
      if (
        !data.success ||
        data.data.exp <= now.getTime() ||
        data.data.at > now.getTime() ||
        data.data.exp - data.data.at !== TTL
      )
        return null;
      return data.data;
    } catch {
      return null;
    }
  }
  imageUrl(target: MailQrTarget, now = new Date()) {
    return `${this.env.PORTAL_URL}/v1/public/mail-qr/${this.sign(target, now)}.png`;
  }
  private mac(encoded: string) {
    return createHmac('sha256', this.secret).update(`mail-qr|${encoded}`).digest('hex');
  }
}
