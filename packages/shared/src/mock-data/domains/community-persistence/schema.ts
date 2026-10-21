import { z } from 'zod';
import { botSnapshotSchema } from './bot-schema';
import { chatSnapshotSchema } from './chat-schema';
import { wireCount } from './wire';

/** Domain composition, not a replacement financial snapshot or credential store. */
export const communitySnapshotSchema = z.strictObject({
  version: z.literal(1),
  sequence: wireCount,
  bot: botSnapshotSchema,
  chat: chatSnapshotSchema,
});
export type CommunitySnapshot = z.infer<typeof communitySnapshotSchema>;
