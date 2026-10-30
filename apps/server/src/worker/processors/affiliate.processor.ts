import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import {
  AffiliateBackfillService,
  AffiliateLifecycleHandler,
  AffiliateNotifyHandler,
  AffiliateAdminNotifyHandler,
  FundraisingCommissionHandler,
  RevenueSharingHandler,
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
    private readonly fundraising: FundraisingCommissionHandler,
    private readonly revenue: RevenueSharingHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.relay.register('affiliate.revenue_received', (p) => this.revenue.received(p));
    this.relay.register('membership_fee.confirmed', (p) => this.lifecycle.onFeeConfirmed(p));
    this.relay.register('fundraising.reviewed', (p) => this.fundraising.onReviewed(p));
    this.relay.register('affiliate.commission_recorded', (p) => this.notify.recorded(p));
    this.relay.register('affiliate.commission_cancelled', (p) => this.adminNotify.cancelled(p));
    this.relay.register('affiliate.rate_changed', (p) => this.adminNotify.rateChanged(p));
    this.relay.register('affiliate.payout_recorded', (p) => this.adminNotify.payout(p));
    await this.backfill.ensureForPaidMembers();
  }
}
