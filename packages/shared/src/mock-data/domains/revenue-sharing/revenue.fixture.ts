import { newMemberMe } from '../../auth';
import { attachMockAffiliate } from '../affiliate';
import { mockDb } from '../store';
import { mockDirectorState } from '../regional-directors/state';
import { captureMockRevenue } from './capture';
import type { RevenueReceipt } from '../../../outbox/revenue-sharing';

export const NOW = Date.parse('2026-11-01T03:00:00Z');
export const OCT = '2026-10-15T03:00:00.000Z';
export function revenueCustomer() {
  const north = mockDb().groups.find((g) => g.kind === 'province' && g.province === 'Hà Nội');
  if (!north) throw new Error('Missing province fixture');
  mockDb().groupMembers.set('m1', new Map([[north.id, 'member']]));
  const user = newMemberMe(`${crypto.randomUUID()}@example.test`, 'Revenue customer');
  attachMockAffiliate(user, 'OPCAN26');
  return user;
}
export function receipt(
  customerId: string,
  overrides: Partial<RevenueReceipt> = {},
): RevenueReceipt {
  return {
    source: 'membership',
    sourceId: crypto.randomUUID(),
    customerId,
    plan: 'personal',
    amount: 101,
    receivedAt: OCT,
    recordedAt: OCT,
    ...overrides,
  };
}
export const earn = (customerId: string, overrides: Partial<RevenueReceipt> = {}) =>
  captureMockRevenue(receipt(customerId, overrides));
export const northSlot = () => {
  const slot = mockDirectorState().config.slots.find((r) => r.region === 'north');
  if (!slot) throw new Error('Missing north slot');
  return slot;
};
