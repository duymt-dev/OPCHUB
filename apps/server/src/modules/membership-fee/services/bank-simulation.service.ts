import { Inject, Injectable } from '@nestjs/common';
import {
  FakeBankProvider,
  type BankWebhookProvider,
  type FakeBankBody,
} from '@opchub/integrations';
import { ENV, type Env } from '@/common/config';
import { BANK } from '@/common/integrations';
import { notFound } from '@/common/errors';
import { BankKeyService } from './bank-key.service';
import { ReconcileService } from './reconcile.service';

/** Shared fake-only ingress for the existing dev route and authenticated Admin action. */
@Injectable()
export class BankSimulationService {
  constructor(
    private readonly reconcile: ReconcileService,
    private readonly keys: BankKeyService,
    @Inject(BANK) private readonly bank: BankWebhookProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}
  async ingest(body: FakeBankBody) {
    if (this.env.NODE_ENV === 'production' || !(this.bank instanceof FakeBankProvider))
      throw notFound();
    const txn = this.bank.push(body);
    const signed = this.bank.sign({ ...body, id: txn.bankTxnId }, await this.keys.current());
    return this.reconcile.ingestWebhook(Buffer.from(signed.rawBody), signed.headers);
  }
}
