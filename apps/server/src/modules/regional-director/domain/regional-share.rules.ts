import {
  regionalAmount,
  regionalPercent,
  customerYearOf,
  payoutMonthOf,
  type RegionalPolicy,
} from '@opchub/shared';

export interface ShareSource {
  source: 'membership' | 'fundraising';
  sourceId: string;
  customerId: string;
  baseAmount: number;
  plan: 'personal' | 'business' | 'fundraising';
  at: Date;
}
export function regionalShareSnapshot(
  input: ShareSource,
  first: Date,
  policy: RegionalPolicy,
  occupied: boolean,
) {
  const customerYear = customerYearOf(first, input.at);
  const percent = occupied ? regionalPercent(customerYear, policy) : 0;
  return {
    customerYear,
    percent,
    ...regionalAmount(input.baseAmount, percent),
    monthKey: payoutMonthOf(input.at),
  };
}
export const canPayRegionalShare = (status: 'pending' | 'paid') => status === 'pending';
