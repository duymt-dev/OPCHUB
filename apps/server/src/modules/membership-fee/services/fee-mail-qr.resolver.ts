import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { transferContentOf } from '@opchub/shared';
import type { MailQrPayload } from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { bankTransferOf } from '@/common/integrations';
import { MemberDirectory } from '@/modules/account';
import { MailQrRegistry, type MailQrResolver } from '@/modules/mail';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';

@Injectable()
export class FeeMailQrResolver implements MailQrResolver, OnModuleInit {
  constructor(
    private readonly registry: MailQrRegistry,
    private readonly fees: MembershipFeeRepository,
    private readonly members: MemberDirectory,
    @Inject(ENV) private readonly env: Env,
  ) {}
  onModuleInit() {
    this.registry.register('fee', this);
  }
  async resolve(target: MailQrPayload) {
    if (target.kind !== 'fee') return null;
    const fee = await this.fees.mailQrTarget(target.id);
    if (
      !fee?.validUntil ||
      fee.validUntil.toISOString() !== target.anchor ||
      fee.amount <= 0 ||
      fee.status === 'regional_director' ||
      (fee.paidAt && fee.paidAt.getTime() > target.at)
    )
      return null;
    const user = await this.members.byId(fee.userId);
    return user
      ? bankTransferOf(this.env, fee.amount, transferContentOf(user.memberCode, user.phone)).qr
      : null;
  }
}
