import type { Message } from '../../api-domains';
import { recordMockBotMessage, type WriteContext } from './bot-message-store';
import { enqueueMockKeywordHit } from './moderation-jobs';
import { mockDb } from './store';

/** Runtime publication only: demo-history insertion deliberately does not replay jobs. */
export function publishMockBotMessage(message: Message, context: WriteContext): boolean {
  const stored = recordMockBotMessage(mockDb(), message, context);
  if (stored) enqueueMockKeywordHit(message.id);
  return stored;
}
