import { affiliateDemoCustomers, affiliateDemoAgents } from '../affiliate';

/** Customer-year DATA from v4.6 AF0, not an alternative age calculation. */
const yearsByAgent: Record<string, readonly number[]> = {
  a1: [2, 1, 1, 1, 1, 2, 1, 3, 1],
  a2: [1, 1, 3, 2, 1, 1],
  a3: [1, 2, 1, 1, 3, 1, 2, 1, 1, 4, 1, 2, 1, 1],
  a4: [1, 1, 1],
  a5: [1, 3, 2, 1, 1, 1, 1, 2, 3, 1, 1, 1, 2, 1, 1, 3, 1, 2],
  a6: [2],
};

export const AFFILIATE_REVENUE_APPOINTED_AT = '2026-08-01T00:00:00.000Z';
export const AFFILIATE_REVENUE_HISTORY_ID = '62810000-0000-4000-8000-000000000001';
export const affiliateRevenueProvinces: Record<string, string> = {
  a1: 'Hà Nội',
  a2: 'Hà Nội',
  a3: 'Hà Nội',
  a4: 'Hà Nội',
  a5: 'Hà Nội',
  a6: 'Đà Nẵng',
};

/** Persist these as real earlier receipts; allocation always computes age from dates. */
export const affiliateRevenueCustomers = affiliateDemoCustomers.map((customer, index) => {
  const peers = affiliateDemoCustomers.filter((c) => c.affiliateId === customer.affiliateId);
  const year = yearsByAgent[customer.affiliateId]?.[peers.indexOf(customer)];
  if (!year) throw new Error('Missing AF0 first-receipt chronology');
  const first = new Date(customer.paidAt);
  first.setUTCFullYear(first.getUTCFullYear() - year + 1);
  return {
    ...customer,
    firstReceivedAt: first.toISOString(),
    registeredAt: new Date(first.getTime() - 86_400_000).toISOString(),
    shareId: `62810000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`,
    sourceId: `demo-receipt-demo-fee-${customer.userId}`,
    historicalPeriodId: `af-first-period-${customer.id}`,
    historicalPaymentId: `af-first-payment-${customer.id}`,
  };
});

export const affiliateRevenueOwners = affiliateDemoAgents.map((agent) => {
  const province = affiliateRevenueProvinces[agent.id];
  if (!province) throw new Error('Missing AF0 owner province');
  const earliest = Math.min(
    ...affiliateRevenueCustomers
      .filter((c) => c.affiliateId === agent.id)
      .map((c) => Date.parse(c.registeredAt)),
  );
  return {
    ...agent,
    firstReceivedAt: new Date(earliest - 7 * 86_400_000).toISOString(),
    registeredAt: new Date(earliest - 8 * 86_400_000).toISOString(),
    historicalPeriodId: `af-first-period-${agent.id}`,
    historicalPaymentId: `af-first-payment-${agent.id}`,
    province,
  };
});
