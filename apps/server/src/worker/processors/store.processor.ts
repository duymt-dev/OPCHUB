import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { StoreAutoCreateHandler } from '@/modules/local-business';

/** V4-608 (UP-03, D-75, D-84): đóng phí xác nhận → tạo gian hàng nháp cho TK Doanh nghiệp */
@Injectable()
export class StoreProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly autoCreate: StoreAutoCreateHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('membership_fee.confirmed', (p) => this.autoCreate.onFeeConfirmed(p));
  }
}
