import type { z } from 'zod';
import type { botMessageContextSchema } from '../../api-domains';

/** Private mock persistence, never spread into public Message/ChatMessage DTOs. */
export interface MockBotMessageMeta extends z.output<typeof botMessageContextSchema> {
  roomId: string;
  personaId: string;
  opening: boolean;
  createdAt: string;
  replyToId?: string;
}
