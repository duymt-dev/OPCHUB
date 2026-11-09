import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { AiBudgetNotifyHandler } from '@/modules/llm-config';

@Injectable()
export class AiBudgetProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly handler: AiBudgetNotifyHandler,
  ) {}
  onApplicationBootstrap() {
    this.relay.registerWithId('ai.budget_warned', (p, id) =>
      this.handler.send(p.month, 'warn', id, p.pct),
    );
    this.relay.registerWithId('ai.budget_exhausted', (p, id) =>
      this.handler.send(p.month, 'exhausted', id),
    );
  }
}
