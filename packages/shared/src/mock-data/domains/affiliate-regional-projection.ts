import { communities, industryGroups } from '../../fixtures';
import { regionalProvinces } from '../../api-domains';
import { mockDb } from './store';
import { mockRegionalDirectors } from './regional-directors';
export function mockAffiliateRegion(userId: string) {
  const memberships = [...(mockDb().groupMembers.get(userId) ?? [])];
  const first = memberships.find(
    ([id, status]) =>
      status === 'member' && [...communities, ...industryGroups].some((g) => g.id === id),
  );
  const group = [...communities, ...industryGroups].find((g) => g.id === first?.[0]);
  if (!group) return null;
  const slot = mockRegionalDirectors(false).items.find((s) =>
    regionalProvinces(s.region).includes(group.province),
  );
  return slot
    ? {
        region: slot.region,
        provinceName: group.province,
        directorName: slot.member?.fullName ?? null,
      }
    : null;
}
