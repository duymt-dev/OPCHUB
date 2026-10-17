import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { JoinRequestService } from '@/modules/community';

/** Consumer outbox community: yêu cầu vào nhóm → `member.request` tới chủ nhóm (B21) */
@Injectable()
export class CommunityProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly requests: JoinRequestService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('group.join_requested', (p) => this.requests.notifyOwners(p));
  }
}
