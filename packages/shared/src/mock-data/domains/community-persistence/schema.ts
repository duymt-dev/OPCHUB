import { z } from 'zod';
import { botSnapshotSchema } from './bot-schema';
import { chatSnapshotSchema } from './chat-schema';
import { wireCount } from './wire';
import { registrationSnapshotSchema } from '../registration/schema';
import { projectSnapshotSchema } from '../project-persistence/schema';
import { pricingSnapshotSchema } from '../pricing-persistence/schema';
import { moderationSnapshotSchema } from '../moderation-persistence/schema';

/** Domain composition, not a replacement financial snapshot or credential store. */
export const communitySnapshotSchema = z.strictObject({
  version: z.literal(1),
  sequence: wireCount,
  bot: botSnapshotSchema,
  chat: chatSnapshotSchema,
  registration: registrationSnapshotSchema.optional(),
  projects: projectSnapshotSchema.optional(),
  pricing: pricingSnapshotSchema.optional(),
  moderation: moderationSnapshotSchema.optional(),
});
export type CommunitySnapshot = z.infer<typeof communitySnapshotSchema>;
