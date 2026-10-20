import { Global, Injectable, Module } from '@nestjs/common';
import { MailCoreModule } from '../mail';
import {
  AccountCoreModule,
  FEE_READER,
  FEE_WRITER,
  type FeeReader,
  type FeeSnapshot,
} from '../account';
import { AdminFeeTransactionsController } from './controllers/admin-fee-transactions.controller';
import { AdminFeesController } from './controllers/admin-fees.controller';
import { BankWebhookController } from './controllers/bank-webhook.controller';
import { DevBankController } from './controllers/dev-bank.controller';
import { MeMembershipController } from './controllers/me-membership.controller';
import { AdminFeesRepository } from './repositories/admin-fees.repository';
import { FeeReminderRepository } from './repositories/fee-reminder.repository';
import { MembershipFeeRepository } from './repositories/membership-fee.repository';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository';
import { PaidMembersRepository } from './repositories/paid-members.repository';
import { AdminFeesService } from './services/admin-fees.service';
import { FeeEventsHandler } from './services/fee-events.handler';
import { FeeSchedulerService } from './services/fee-scheduler.service';
import { FeeTransactionsService } from './services/fee-transactions.service';
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
  PaidMembersRepository,
  MembershipFeeRepository,
  PaymentTransactionRepository,
  MembershipFeeService,
  ReconcileService,
  FeeSchedulerService,
  FeeEventsHandler,
  AdminFeesRepository,
  FeeReminderRepository,
  AdminFeesService,
  FeeTransactionsService,
];

/** Service + repository (không controller) — dùng cho cả api, socket, worker */
@Global()
@Module({
  imports: [AccountCoreModule, MailCoreModule],
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
  controllers: [
    MeMembershipController,
    BankWebhookController,
    DevBankController,
    AdminFeeTransactionsController,
    AdminFeesController,
  ],
})
export class MembershipFeeHttpModule {}
