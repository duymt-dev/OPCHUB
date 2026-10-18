import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { InvestorNotifyHandler } from '@/modules/investor';

/** Consumer outbox nhà đầu tư: Admin phản hồi → thông báo `invest` cho NĐT (IV-R01, TIP-V2-107) */
@Injectable()
export class InvestorProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly handler: InvestorNotifyHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('investor.admin_replied', (p) => this.handler.adminReplied(p));
  }
}
