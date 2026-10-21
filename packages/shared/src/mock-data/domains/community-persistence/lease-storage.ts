import { z } from 'zod';
import { affiliateSnapshotSchema, type AffiliateSnapshot } from '../affiliate-persistence/schema';
import { communitySnapshotSchema, type CommunitySnapshot } from './schema';

const envelope = z.strictObject({
  kind: z.literal('opchub-msw-domains'),
  version: z.literal(2),
  affiliate: affiliateSnapshotSchema,
  community: communitySnapshotSchema,
});

export interface MockLeaseState {
  snapshot: AffiliateSnapshot | null;
  communitySnapshot?: CommunitySnapshot;
}

/** Upgrade legacy ledger lazily without deleting or truncating any historical financial row. */
export function readMockLeaseState(raw: string | null): MockLeaseState {
  if (raw === null) return { snapshot: null };
  const input: unknown = JSON.parse(raw);
  const current = envelope.safeParse(input);
  if (current.success)
    return { snapshot: current.data.affiliate, communitySnapshot: current.data.community };
  return { snapshot: affiliateSnapshotSchema.parse(input) };
}

export function serializeMockLeaseState(
  snapshot: AffiliateSnapshot,
  communitySnapshot: CommunitySnapshot | undefined,
  previous: MockLeaseState,
): string {
  const community = communitySnapshot ?? previous.communitySnapshot;
  return JSON.stringify(
    community
      ? envelope.parse({ kind: 'opchub-msw-domains', version: 2, affiliate: snapshot, community })
      : affiliateSnapshotSchema.parse(snapshot),
  );
}
