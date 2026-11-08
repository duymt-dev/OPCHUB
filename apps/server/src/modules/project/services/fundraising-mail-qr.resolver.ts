import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { transferContentOf } from '@opchub/shared';
import type { MailQrPayload } from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { bankTransferOf } from '@/common/integrations';
import { MemberDirectory } from '@/modules/account';
import { MailQrRegistry, type MailQrResolver } from '@/modules/mail';
import { FundraisingRepository } from '../repositories/fundraising.repository';

@Injectable()
export class FundraisingMailQrResolver implements MailQrResolver, OnModuleInit {
  constructor(
    private readonly registry: MailQrRegistry,
    private readonly repo: FundraisingRepository,
    private readonly members: MemberDirectory,
    @Inject(ENV) private readonly env: Env,
  ) {}
  onModuleInit() {
    this.registry.register('fundraising', this);
  }
  async resolve(target: MailQrPayload) {
    if (target.kind !== 'fundraising') return null;
    const row = await this.repo.mailQrTarget(target.id);
    if (!row?.code || row.amount <= 0) return null;
    const owner = await this.members.byId(row.ownerId);
    return owner
      ? bankTransferOf(
          this.env,
          row.amount,
          transferContentOf(owner.memberCode, owner.phone, row.code),
        ).qr
      : null;
  }
}
