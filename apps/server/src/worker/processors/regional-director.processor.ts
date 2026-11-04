import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { RegionalDirectorEventsHandler } from '@/modules/regional-director';

@Injectable()
export class RegionalDirectorProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly handler: RegionalDirectorEventsHandler,
  ) {}
  onApplicationBootstrap() {
    this.relay.registerWithId('regional_director.appointed', (p, id) =>
      this.handler.appointed(p, id),
    );
    this.relay.registerWithId('regional_director.revoked', (p, id) => this.handler.revoked(p, id));
  }
}
