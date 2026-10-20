import type { Scenario } from '../types';
import { affiliateDetail, openAffiliate } from './admin-affiliate-steps';
import { ADMIN_AFFILIATE_STATES } from './admin-affiliate-states';
import { ADMIN_AFFILIATE_LIST_STATES } from './admin-affiliate-list-states';
import { ADMIN_AFFILIATE_COMMISSION_STATES } from './admin-affiliate-commission-states';

/** TIP-V2-404: measure the actual default AF0 list, never hide automatic agents for parity. */
export const ADMIN_AFFILIATE: Scenario[] = [
  {
    id: 'D-84',
    name: 'Admin · Affiliate',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: openAffiliate,
  },
  {
    id: 'D-85',
    name: 'Admin · Affiliate · Chi tiết đại lý',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: affiliateDetail,
  },
  ...ADMIN_AFFILIATE_STATES,
  ...ADMIN_AFFILIATE_LIST_STATES,
  ...ADMIN_AFFILIATE_COMMISSION_STATES,
];
