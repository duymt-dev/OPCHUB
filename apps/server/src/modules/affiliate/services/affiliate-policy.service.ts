import { Injectable } from '@nestjs/common';
import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PolicyRepository } from '../repositories/policy.repository';
import type { AffiliateActor } from '../types';
import { RegionalValidationError } from './regional-policy-validation';

@Injectable()
export class AffiliatePolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PolicyRepository,
    private readonly audit: AuditService,
  ) {}

  get() {
    return this.repo.get();
  }

  update(actor: AffiliateActor, policy: AffiliatePolicy) {
    if (policy.regionalMin > policy.regionalFirstYear) throw new RegionalValidationError();
    return this.prisma.db.$transaction(async (tx) => {
      const before = await this.repo.lock(tx);
      const updated = await this.repo.update(tx, policy);
      const changed = (Object.keys(updated) as (keyof AffiliatePolicy)[]).filter(
        (k) => before[k] !== updated[k],
      );
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'affiliate.policy_update',
        entity: 'affiliate_policy',
        entityId: '1',
        tag: 'affiliate',
        summary: 'Cập nhật chính sách Affiliate',
        diff: {
          before: Object.fromEntries(changed.map((k) => [k, before[k]] as const)),
          after: Object.fromEntries(changed.map((k) => [k, updated[k]] as const)),
        },
      });
      return updated;
    });
  }
}
