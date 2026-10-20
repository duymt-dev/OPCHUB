import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import {
  AffiliateBackfillService,
  AffiliateLifecycleHandler,
  AffiliateNotifyHandler,
} from '@/modules/affiliate';

/** Consumer outbox phí → đại lý + hoa hồng + thông báo (§20, TIP-V2-401) */
@Injectable()
export class AffiliateProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly lifecycle: AffiliateLifecycleHandler,
    private readonly notify: AffiliateNotifyHandler,
    private readonly backfill: AffiliateBackfillService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.relay.register('membership_fee.confirmed', (p) => this.lifecycle.onFeeConfirmed(p));
    this.relay.register('membership_fee.changed', (p) => this.lifecycle.onFeeChanged(p));
    this.relay.register('membership_fee.activated', (p) => this.lifecycle.onFeeChanged(p));
    this.relay.register('affiliate.commission_recorded', (p) => this.notify.recorded(p));
    await this.backfill.ensureForPaidMembers();
  }
}
