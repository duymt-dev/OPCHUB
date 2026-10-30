import type { RevenueSharingPolicy } from '../api-domains/revenue-sharing';

/** Mock seed matching migration defaults; live reads use persisted policy. */
export const REVENUE_POLICY_DEFAULTS: RevenueSharingPolicy = {
  yearOneRate: 50,
  annualDecrease: 10,
  minimumRate: 20,
};
