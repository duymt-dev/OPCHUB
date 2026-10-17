import { Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  type BankWebhookProvider,
  FakeBankProvider,
  fakeBankBodySchema,
} from '@opchub/integrations';
import { z } from 'zod';
import { Public } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { notFound } from '@/common/errors';
import { ZodBody } from '@/common/http/zod';
import { BANK } from '@/common/integrations';
import { ReconcileService } from '../services/reconcile.service';

type SimulateBody = z.infer<typeof fakeBankBodySchema>;

/**
 * Chỉ dev/test (FakeBank): giả một giao dịch tiền vào rồi đi ĐÚNG đường webhook thật
 * (ký HMAC → verify → lưu → khớp). Production hoặc provider thật → 404.
 */
@Controller('dev/bank')
export class DevBankController {
  constructor(
    private readonly reconcile: ReconcileService,
    @Inject(BANK) private readonly bank: BankWebhookProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Post('simulate')
  @HttpCode(200)
  async simulate(@ZodBody(fakeBankBodySchema) body: SimulateBody): Promise<{ received: number }> {
    if (this.env.NODE_ENV === 'production' || !(this.bank instanceof FakeBankProvider)) {
      throw notFound();
    }
    this.bank.push(body);
    const signed = this.bank.sign(body);
    const received = await this.reconcile.ingestWebhook(
      Buffer.from(signed.rawBody),
      signed.headers,
    );
    return { received };
  }
}
