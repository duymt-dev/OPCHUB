import { z } from 'zod';
import { moderationSettingsSchema, reportSchema } from '../../../api-domains';
import { wireCount, wireEntries, wireId } from '../community-persistence/wire';

/** Mock domain records only; never access/refresh tokens or passwords. */
export const moderationSnapshotSchema = z.strictObject({
  reports: z.array(reportSchema),
  messageIds: wireEntries(wireId),
  sources: wireEntries(
    z.strictObject({
      userId: wireId.nullable(),
      messageId: wireId,
      roomId: wireId,
    }),
  ),
  violations: wireEntries(
    z.strictObject({
      userId: wireId,
      messageId: wireId,
      at: wireCount,
      revoked: z.boolean(),
    }),
  ),
  settings: moderationSettingsSchema,
  restored: z.array(wireId),
  statuses: wireEntries(z.enum(['active', 'locked'])),
  locks: wireEntries(
    z.strictObject({ until: wireCount.nullable(), kind: z.enum(['manual', 'auto']) }),
  ),
  reasons: wireEntries(z.string().nullable()),
  epochs: wireEntries(wireCount),
  keywordJobs: z.strictObject({
    queued: z.array(wireId),
    pending: wireEntries(z.string().min(1).max(60)),
  }),
});
export type ModerationSnapshot = z.infer<typeof moderationSnapshotSchema>;
