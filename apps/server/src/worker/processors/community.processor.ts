import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { GroupEventsHandler, JoinRequestService } from '@/modules/community';

/**
 * Consumer outbox community: yêu cầu vào nhóm → `member.request` tới chủ nhóm (B21); chủ đề mới
 * → `room.created` (NA-09)
 */
@Injectable()
export class CommunityProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly requests: JoinRequestService,
    private readonly groups: GroupEventsHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('group.join_requested', (p) => this.requests.notifyOwners(p));
    this.relay.register('group.topic_created', (p) => this.groups.topicCreated(p));
  }
}
