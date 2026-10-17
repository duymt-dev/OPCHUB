import { Global, Injectable, Module } from '@nestjs/common';
import {
  AccountCoreModule,
  FEE_READER,
  FEE_WRITER,
  type FeeReader,
  type FeeSnapshot,
} from '../account';
import { BankWebhookController } from './controllers/bank-webhook.controller';
import { DevBankController } from './controllers/dev-bank.controller';
import { MeMembershipController } from './controllers/me-membership.controller';
import { MembershipFeeRepository } from './repositories/membership-fee.repository';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository';
import { FeeEventsHandler } from './services/fee-events.handler';
import { FeeSchedulerService } from './services/fee-scheduler.service';
import { FeeWriterService } from './services/fee-writer.service';
import { MembershipFeeService } from './services/membership-fee.service';
import { ReconcileService } from './services/reconcile.service';

/** Hiện thực cổng FeeReader cho account (dựng `me` + claim JWT) */
@Injectable()
export class FeeReaderService implements FeeReader {
  constructor(private readonly repo: MembershipFeeRepository) {}

  feeOf(userId: string): Promise<FeeSnapshot | null> {
    return this.repo.findCurrent(userId);
  }
}

const services = [
  MembershipFeeRepository,
  PaymentTransactionRepository,
  MembershipFeeService,
  ReconcileService,
  FeeSchedulerService,
  FeeEventsHandler,
];

/** Service + repository (không controller) — dùng cho cả api, socket, worker */
@Global()
@Module({
  imports: [AccountCoreModule],
  providers: [
    ...services,
    FeeReaderService,
    { provide: FEE_READER, useExisting: FeeReaderService },
    FeeWriterService,
    { provide: FEE_WRITER, useExisting: FeeWriterService },
  ],
  exports: [...services, FEE_READER, FEE_WRITER],
})
export class MembershipFeeCoreModule {}

@Module({
  imports: [MembershipFeeCoreModule],
  controllers: [MeMembershipController, BankWebhookController, DevBankController],
})
export class MembershipFeeHttpModule {}
