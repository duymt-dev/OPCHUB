import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { StoreAutoCreateHandler } from '@/modules/local-business';

/** V4-608 (UP-03, D-75, D-84): đóng phí → tạo gian hàng nháp cho TK DN; ghi nhận `store.published` */
@Injectable()
export class StoreProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(StoreProcessor.name);

  constructor(
    private readonly relay: OutboxRelayService,
    private readonly autoCreate: StoreAutoCreateHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('membership_fee.confirmed', (p) => this.autoCreate.onFeeConfirmed(p));
    // V4-611 (onboarding) sẽ thêm handler; hiện chỉ ghi nhận để relay không giữ sự kiện treo
    this.relay.register('store.published', (p) => {
      this.logger.log(`Gian hàng ${p.storeId} xuất bản`);
      return Promise.resolve();
    });
  }
}
