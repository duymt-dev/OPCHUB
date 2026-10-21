import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PersonaVisibilityService } from '@/modules/chat';
import { DashboardContentCacheService } from '@/modules/dashboard';

@Injectable()
export class BotHidePublicationService {
  constructor(
    private readonly chat: PersonaVisibilityService,
    private readonly dashboard: DashboardContentCacheService,
  ) {}

  async handle(payload: OutboxPayload<'bot.messages_hidden'>): Promise<void> {
    await this.dashboard.invalidate();
    await this.chat.publishHidden(payload.roomIds, payload.messageIds, payload.bulk);
  }
}
