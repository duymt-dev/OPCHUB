import { mockDb } from '../store';
import { captureBotSnapshot, restoreBotSnapshot } from './bot-snapshot';
import { captureChatSnapshot, restoreChatSnapshot } from './chat-snapshot';
import { communitySnapshotSchema, type CommunitySnapshot } from './schema';

export function captureCommunitySnapshot(): CommunitySnapshot {
  return communitySnapshotSchema.parse({
    version: 1,
    sequence: mockDb().seq,
    bot: captureBotSnapshot(),
    chat: captureChatSnapshot(),
  });
}

/** Validate the complete composition before changing any domain; never replay publication. */
export function restoreCommunitySnapshot(input: unknown): void {
  const data = communitySnapshotSchema.parse(input);
  restoreBotSnapshot(data.bot);
  restoreChatSnapshot(data.chat);
  mockDb().seq = Math.max(mockDb().seq, data.sequence);
}
