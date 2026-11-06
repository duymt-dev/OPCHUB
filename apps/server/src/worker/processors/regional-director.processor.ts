import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import {
  RegionalDirectorEventsHandler,
  RegionalShareEventsHandler,
} from '@/modules/regional-director';

@Injectable()
export class RegionalDirectorProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly handler: RegionalDirectorEventsHandler,
    private readonly shares: RegionalShareEventsHandler,
  ) {}
  onApplicationBootstrap() {
    this.relay.registerWithId('regional_share.recorded', (p) => this.shares.recorded(p));
    this.relay.registerWithId('membership_fee.confirmed', (p) => this.shares.membership(p));
    this.relay.registerWithId('fundraising.reviewed', (p) => this.shares.fundraising(p));
    this.relay.registerWithId('regional_share.payout_recorded', (p) => this.shares.payout(p));
    this.relay.registerWithId('regional_director.appointed', (p, id) =>
      this.handler.appointed(p, id),
    );
    this.relay.registerWithId('regional_director.revoked', (p, id) => this.handler.revoked(p, id));
  }
}
