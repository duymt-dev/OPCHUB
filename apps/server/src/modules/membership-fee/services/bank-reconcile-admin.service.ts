import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { BankWebhookProvider } from '@opchub/integrations';
import { planAmountOf, transferContentOf } from '@opchub/shared';
import type { BankSettingsPatch, BankTxnQuery } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { ENV, type Env } from '@/common/config';
import { AppError, conflict, notFound } from '@/common/errors';
import { BANK } from '@/common/integrations';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PriceConfigService } from '../../pricing';
import { MemberDirectory } from '../../account';
import { AppSettingsService } from '../../settings';
import { BankTransactionsRepository } from '../repositories/bank-transactions.repository';
import { BankKeyService } from './bank-key.service';
import { BankSimulationService } from './bank-simulation.service';
import { ReconcileService } from './reconcile.service';

type Actor = { id: string; ip: string | null };
@Injectable()
export class BankReconcileAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppSettingsService,
    private readonly txns: BankTransactionsRepository,
    private readonly keys: BankKeyService,
    private readonly audit: AuditService,
    private readonly simulation: BankSimulationService,
    private readonly reconcile: ReconcileService,
    private readonly members: MemberDirectory,
    private readonly prices: PriceConfigService,
    @Inject(ENV) private readonly env: Env,
    @Inject(BANK) private readonly bank: BankWebhookProvider,
  ) {}
  async config() {
    const [config, keyHint, counts] = await Promise.all([
      this.settings.bank(),
      this.keys.hint(),
      this.txns.counts(),
    ]);
    return {
      ...config,
      keyHint,
      counts,
      provider: this.env.BANK_PROVIDER,
      webhookUrl: `${this.env.API_PUBLIC_URL.replace(/\/$/, '')}/v1/webhooks/bank`,
      bankName: this.env.BANK_NAME,
      accountNo: this.env.BANK_ACCOUNT_NO,
      accountName: this.env.BANK_ACCOUNT_NAME,
      canSimulate: this.env.BANK_PROVIDER === 'fake' && this.env.NODE_ENV !== 'production',
    };
  }
  async patch(actor: Actor, value: BankSettingsPatch) {
    await this.prisma.db.$transaction(async (tx) => {
      const before = await tx.appSetting.findUniqueOrThrow({
        where: { key: 'bank' },
        select: { value: true },
      });
      await tx.appSetting.update({ where: { key: 'bank' }, data: { value } });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'settings.bank',
        entity: 'settings',
        entityId: 'bank',
        tag: 'settings',
        summary: 'Cập nhật đối soát ngân hàng',
        diff: { before: before.value, after: value },
      });
    });
    await this.settings.invalidate('bank');
    return this.config();
  }
  list(q: BankTxnQuery) {
    return this.txns.page(q);
  }
  async short(actor: Actor, id: string, note: string) {
    await this.prisma.db.$transaction(async (tx) => {
      if ((await this.txns.markShort(tx, id, actor.id, note)).count !== 1) {
        throw conflict('Giao dịch không còn ở trạng thái chưa khớp');
      }
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'fee.short_record',
        entity: 'payment_transaction',
        entityId: id,
        tag: 'member',
        summary: 'Ghi nhận giao dịch thiếu tiền',
        diff: { note },
      });
    });
  }
  async test() {
    try {
      const rows = await this.bank.listSince(new Date(Date.now() - 600_000));
      return { provider: this.env.BANK_PROVIDER, received: rows.length };
    } catch {
      throw new AppError('INTEGRATION_ERROR', 'Không thể kết nối cổng ngân hàng');
    }
  }
  async simulate(actor: Actor) {
    if (this.env.BANK_PROVIDER !== 'fake' || this.env.NODE_ENV === 'production') throw notFound();
    const member = await this.members.byMemberCode('TV000004');
    if (!member) throw notFound('Chưa có thành viên demo Gói Cá nhân');
    const amount = planAmountOf(await this.prices.current(), 'personal');
    const id = `admin-sim-${randomUUID()}`;
    const content = transferContentOf(member.memberCode, member.phone);
    await this.simulation.ingest({ id, amount, content });
    const txnId = await this.txns.idForFake(id);
    await this.reconcile.match(txnId);
    // The real worker may win the same queued job; report committed state, not 'handled'.
    const autoActivated = await this.txns.wasAutoMatched(txnId);
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'bank.simulate',
        entity: 'payment_transaction',
        entityId: txnId,
        tag: 'member',
        summary: 'Mô phỏng giao dịch ngân hàng',
      }),
    );
    return {
      id: txnId,
      amount,
      content,
      autoActivated,
      memberName: member.fullName,
      plan: 'personal' as const,
    };
  }
}
