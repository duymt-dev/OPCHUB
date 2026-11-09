import { mockMyRegionAffiliateRows } from './my-region-affiliates';
import { myRegionSchema, type MyRegion } from '../../api-domains';
import {
  regionalPayoutDate,
  regionalPercent,
  payoutMonthOf,
} from '../../membership/regional-share';
import { mockRegionalDirectors } from './regional-directors';
import { regionalShareState } from './regional-share-state';
import { readMockAffiliatePolicy } from './affiliate-policy';

export function mockMyRegion(userId: string, now = new Date()): MyRegion {
  const slot = mockRegionalDirectors(false).items.find((s) => s.member?.id === userId);
  if (!slot) return { state: 'none' };
  const state = regionalShareState();
  const rows = state.rows.filter((r) => r.region === slot.region && r.directorUserId === userId);
  const sum = (items: typeof rows, key: 'baseAmount' | 'directorAmount') =>
    items.reduce((n, r) => n + r[key], 0);
  const paid = rows.filter((r) => r.status === 'paid');
  const groups = mockMyRegionAffiliateRows(userId) ?? [];
  const share = sum(rows, 'directorAmount'),
    paidAmount = sum(paid, 'directorAmount');
  return myRegionSchema.parse({
    state: 'director',
    region: slot.region,
    label: slot.label,
    provinces: slot.provinces,
    bank: slot.bank,
    kpi: {
      revenue: sum(rows, 'baseAmount'),
      count: rows.length,
      share,
      paid: paidAmount,
      due: share - paidAmount,
      paidMonths: new Set(paid.map((r) => payoutMonthOf(r.recordedAt))).size,
    },
    years: [1, 2, 3, 4].map((year) => {
      const group = rows.filter((r) => Math.min(r.customerYear, 4) === year);
      return {
        year,
        percent: regionalPercent(year, readMockAffiliatePolicy()),
        count: group.length,
        revenue: sum(group, 'baseAmount'),
        share: sum(group, 'directorAmount'),
      };
    }),
    affiliates: groups.slice(0, 50),
    more: Math.max(0, groups.length - 50),
    months: [...new Set(rows.map((r) => payoutMonthOf(r.recordedAt)))]
      .sort()
      .reverse()
      .slice(0, 24)
      .map((monthKey) => {
        const group = rows.filter((r) => payoutMonthOf(r.recordedAt) === monthKey);
        const paidAt =
          [...state.receipts.values()]
            .filter(
              (p) =>
                p.directorUserId === userId &&
                p.region === slot.region &&
                p.monthKeys.includes(monthKey),
            )
            .map((p) => p.paidAt)
            .sort()
            .at(-1) ?? null;
        return {
          monthKey,
          amount: sum(group, 'directorAmount'),
          status: group.every((r) => r.status === 'paid') ? 'paid' : 'pending',
          paidAt,
        };
      }),
    payoutDate: regionalPayoutDate(now),
  });
}
