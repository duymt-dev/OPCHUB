import { mockDb } from '../store';
import { captureBotSnapshot, restoreBotSnapshot } from './bot-snapshot';
import { captureChatSnapshot, restoreChatSnapshot } from './chat-snapshot';
import { communitySnapshotSchema, type CommunitySnapshot } from './schema';
import { captureRegistrationSnapshot, restoreRegistrationSnapshot } from '../registration/snapshot';
import { emptyRegistrationSnapshot } from '../registration/schema';
import { captureProjectSnapshot, restoreProjectSnapshot } from '../project-persistence/snapshot';

export function captureCommunitySnapshot(): CommunitySnapshot {
  return communitySnapshotSchema.parse({
    version: 1,
    sequence: mockDb().seq,
    bot: captureBotSnapshot(),
    chat: captureChatSnapshot(),
    registration: captureRegistrationSnapshot(),
    projects: captureProjectSnapshot(),
  });
}

/** Validate the complete composition before changing any domain; never replay publication. */
export function restoreCommunitySnapshot(input: unknown): void {
  const data = communitySnapshotSchema.parse(input);
  restoreBotSnapshot(data.bot);
  restoreChatSnapshot(data.chat);
  restoreRegistrationSnapshot(data.registration ?? emptyRegistrationSnapshot());
  if (data.projects) restoreProjectSnapshot(data.projects);
  mockDb().seq = Math.max(mockDb().seq, data.sequence);
}
