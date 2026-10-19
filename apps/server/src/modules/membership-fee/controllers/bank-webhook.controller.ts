import { Controller, HttpCode, Post, type RawBodyRequest, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '@/common/auth';
import { ReconcileService } from '../services/reconcile.service';

const headersOf = (req: Request): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));

/**
 * Webhook ngân hàng (D-07, security.md): raw body + HMAC timing-safe, sai chữ ký → 401.
 * Không giới hạn tốc độ theo IP chung (provider gửi dồn). Allow IP provider ở Nginx là TUỲ CHỌN
 * (BUG-032): mẫu `infra/nginx/snippets/opchub-bank-allow.conf.example`, chỉ bật khi SePay công bố
 * dải IP — chưa bật thì HMAC ở đây là lớp chặn duy nhất.
 */
@Controller('webhooks/bank')
export class BankWebhookController {
  constructor(private readonly reconcile: ReconcileService) {}

  @Public()
  @SkipThrottle()
  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>): Promise<{ received: number }> {
    return { received: await this.reconcile.ingestWebhook(req.rawBody, headersOf(req)) };
  }
}
