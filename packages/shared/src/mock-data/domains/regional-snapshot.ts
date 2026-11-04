import { z } from 'zod';
import { regionalDirectorsSchema } from '../../api-domains/regional-directors';
import { MEMBERSHIP_FEE_STATUS } from '../../enums';

/** Versioned bridge metadata, without credentials or authoritative permissions. */
export const regionalSnapshotSchema = z.object({
  data: regionalDirectorsSchema,
  previous: z.array(
    z.tuple([
      z.string(),
      z.object({ status: z.enum(MEMBERSHIP_FEE_STATUS), validUntil: z.string().nullable() }),
    ]),
  ),
});
export type RegionalSnapshot = z.infer<typeof regionalSnapshotSchema>;
