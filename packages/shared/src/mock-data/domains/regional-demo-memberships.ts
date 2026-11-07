import { z } from 'zod';
import { GROUP_MEMBER_STATUS } from '../../enums';
import { communities } from '../../fixtures';
import { REGIONAL_DEMO_AFFILIATES } from './regional-share-demo';
import { mockDb } from './store';

const ownerIds = REGIONAL_DEMO_AFFILIATES.map((a) => a.userId);
const membership = z.tuple([z.string().min(1), z.enum(GROUP_MEMBER_STATUS)]);
export const regionalDemoMembershipsSchema = z
  .array(z.tuple([z.enum(ownerIds), z.array(membership)]))
  .refine((rows) => new Set(rows.map(([id]) => id)).size === rows.length)
  .refine((rows) =>
    rows.every(([, groups]) => new Set(groups.map(([id]) => id)).size === groups.length),
  );

export function captureRegionalDemoMemberships(seeded: boolean) {
  return seeded
    ? ownerIds.map((id) => [id, [...(mockDb().groupMembers.get(id) ?? [])]] as const)
    : [];
}

/** Only this fixture's memberships: never overwrite another domain/user's data. */
export function restoreRegionalDemoMemberships(
  memberships: z.infer<typeof regionalDemoMembershipsSchema> | undefined,
  seeded: boolean,
) {
  const db = mockDb();
  if (memberships !== undefined) {
    for (const [id, groups] of memberships) db.groupMembers.set(id, new Map(groups));
    return;
  }
  // Old wire versions omitted fixture memberships. Existing explicit state wins;
  // reconstruct only missing demo owners, never replay a payment or rejoin a user.
  if (!seeded) return;
  for (const owner of REGIONAL_DEMO_AFFILIATES) {
    if (db.groupMembers.has(owner.userId)) continue;
    const group = communities.find((g) => g.province === owner.province);
    if (group) db.groupMembers.set(owner.userId, new Map([[group.id, 'member']]));
  }
}
