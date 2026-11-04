import {
  customerYearOf,
  regionalAmount,
  regionalPercent,
  payoutMonthOf,
  type RegionalPolicy,
} from '../../membership/regional-share';
import type { RegionalRegion } from '../../api-domains/regional-directors';

/** Demo-only province memberships. Never used to attribute production receipts. */
export const REGIONAL_DEMO_AFFILIATES = [
  { affiliateId: 'a1', userId: 'm1', region: 'north', province: 'Hà Nội' },
  { affiliateId: 'a2', userId: 'af-owner-a2', region: 'north', province: 'Hà Nội' },
  { affiliateId: 'a3', userId: 'af-owner-a3', region: 'north', province: 'Hà Nội' },
  { affiliateId: 'a4', userId: 'af-owner-a4', region: 'central', province: 'Đà Nẵng' },
  { affiliateId: 'a5', userId: 'af-owner-a5', region: 'central', province: 'Đà Nẵng' },
  { affiliateId: 'a6', userId: 'af-owner-a6', region: 'south', province: 'TP Hồ Chí Minh' },
] as const;
export interface RegionalDemoSource {
  source: 'membership' | 'fundraising';
  sourceId: string;
  customerId: string;
  affiliateId: string;
  affiliateUserId: string;
  region: RegionalRegion;
  directorUserId: string;
  baseAmount: number;
  plan: 'personal' | 'business' | 'fundraising';
}
export function buildRegionalShareDemo(
  sources: RegionalDemoSource[],
  policy: RegionalPolicy,
  now: Date,
) {
  const month = payoutMonthOf(now);
  const [year = 0, m = 0] = month.split('-').map(Number);
  return sources.map((source, i) => {
    const recordedAt = new Date(Date.UTC(year, m - 1 - (i % 4 === 3 ? 0 : 1), 2, 2, 0, i));
    const firstPaidAt = new Date(recordedAt);
    firstPaidAt.setUTCFullYear(firstPaidAt.getUTCFullYear() - (i % 5));
    const customerYear = customerYearOf(firstPaidAt, recordedAt);
    const percent = regionalPercent(customerYear, policy);
    return {
      ...source,
      id: `regional-demo-${source.source}-${source.sourceId}`,
      recordedAt,
      firstPaidAt,
      customerYear,
      percent,
      ...regionalAmount(source.baseAmount, percent),
      monthKey: payoutMonthOf(recordedAt),
      paid: i === 0,
    };
  });
}
