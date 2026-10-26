import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { GroupEventsHandler } from '@/modules/community';

/** Consumer outbox community: chủ đề mới → `room.created` (NA-09). D-71 bỏ yêu cầu vào nhóm. */
@Injectable()
export class CommunityProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly groups: GroupEventsHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('group.topic_created', (p) => this.groups.topicCreated(p));
  }
}
