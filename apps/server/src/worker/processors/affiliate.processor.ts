import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import {
  AffiliateBackfillService,
  AffiliateLifecycleHandler,
  AffiliateNotifyHandler,
  AffiliateAdminNotifyHandler,
} from '@/modules/affiliate';

/** Consumer outbox phÃ­ â†’ Ä‘áº¡i lÃ½ + hoa há»“ng + thÃ´ng bÃ¡o (Â§20, TIP-V2-401) */
@Injectable()
export class AffiliateProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly lifecycle: AffiliateLifecycleHandler,
    private readonly notify: AffiliateNotifyHandler,
    private readonly adminNotify: AffiliateAdminNotifyHandler,
    private readonly backfill: AffiliateBackfillService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.relay.register('membership_fee.confirmed', (p) => this.lifecycle.onFeeConfirmed(p));
    this.relay.register('membership_fee.changed', (p) => this.lifecycle.onFeeChanged(p));
    this.relay.register('membership_fee.activated', (p) => this.lifecycle.onFeeChanged(p));
    this.relay.register('affiliate.commission_recorded', (p) => this.notify.recorded(p));
    this.relay.register('affiliate.commission_cancelled', (p) => this.adminNotify.cancelled(p));
    this.relay.register('affiliate.rate_changed', (p) => this.adminNotify.rateChanged(p));
    this.relay.register('affiliate.payout_recorded', (p) => this.adminNotify.payout(p));
    await this.backfill.ensureForPaidMembers();
  }
}
