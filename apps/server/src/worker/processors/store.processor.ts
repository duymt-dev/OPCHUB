import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { StoreAutoCreateHandler, StorePublicInvalidationHandler } from '@/modules/local-business';

/** V4-608 / D-114: mở dùng thử hoặc đóng phí → tạo gian hàng Nháp cho TK DN (`store.published` → onboarding) */
@Injectable()
export class StoreProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly autoCreate: StoreAutoCreateHandler,
    private readonly publicPages: StorePublicInvalidationHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('membership_fee.changed', (p) => this.publicPages.changed(p));
    this.relay.register('user.locked', (p) => this.publicPages.changed(p));
    this.relay.register('user.deleted', (p) => this.publicPages.changed(p));
    this.relay.register('membership_fee.trial_started', (p) => this.autoCreate.onTrialStarted(p));
    this.relay.register('membership_fee.confirmed', (p) => this.autoCreate.onFeeConfirmed(p));
  }
}
