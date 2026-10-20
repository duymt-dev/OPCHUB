import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PersonaVisibilityService } from '@/modules/chat';

@Injectable()
export class BotHidePublicationService {
  constructor(private readonly chat: PersonaVisibilityService) {}

  handle(payload: OutboxPayload<'bot.messages_hidden'>): Promise<void> {
    return this.chat.publishHidden(payload.roomIds, payload.messageIds, payload.bulk);
  }
}
