import { z } from 'zod';
import { regionalDirectorsSchema } from '../../api-domains/regional-directors';
import { MEMBERSHIP_FEE_STATUS } from '../../enums';
import { notificationSchema } from '../../api-domains/settings';
import { REGIONAL_NOTICE_PREFIX } from './regional-notices';

/** Versioned bridge metadata, without credentials or authoritative permissions. */
export const regionalSnapshotSchema = z.object({
  data: regionalDirectorsSchema,
  notices: z
    .array(
      z.tuple([
        z.string(),
        z.array(
          notificationSchema.refine(
            (row) => row.type === 'system' && row.id.startsWith(REGIONAL_NOTICE_PREFIX),
          ),
        ),
      ]),
    )
    .default([]),
  previous: z.array(
    z.tuple([
      z.string(),
      z.object({ status: z.enum(MEMBERSHIP_FEE_STATUS), validUntil: z.string().nullable() }),
    ]),
  ),
});
export type RegionalSnapshot = z.infer<typeof regionalSnapshotSchema>;
