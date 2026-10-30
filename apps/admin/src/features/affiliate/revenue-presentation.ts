import type { RevenueSharingPolicy } from '@opchub/shared/api-domains';

const money = new Intl.NumberFormat('vi-VN');
const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const revenueMoney = (value: string | number) => `${money.format(BigInt(value))}đ`;
export const revenueDate = (value: string) => date.format(new Date(value));
export const revenuePeriodEnd = (asOf: string) => {
  const local = new Date(new Date(asOf).getTime() + 7 * 3_600_000);
  return date.format(new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0, 5)));
};

/** Presentation of DB policy only; never computes payable amounts in the browser. */
export function revenuePolicySteps(policy: RevenueSharingPolicy) {
  const { yearOneRate: first, annualDecrease: decrease, minimumRate: floor } = policy;
  const floorYear = decrease === 0 ? null : Math.ceil((first - floor) / decrease) + 1;
  return {
    constant: decrease === 0 || floor === first,
    first,
    years: [1, 2, 3]
      .filter((year) => floorYear === null || year < floorYear)
      .map((year) => ({ year, rate: Math.max(floor, first - decrease * (year - 1)) })),
    floor,
    floorYear,
  };
}
