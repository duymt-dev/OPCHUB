import type { Scenario } from '../types';
import {
  COMMISSION_FILTERS,
  filterCommissions,
  openCommissionMenu,
} from './admin-affiliate-commission-steps';

/** Separate filter and popup measurements; no writes, hidden rows or prototype state injection. */
export const ADMIN_AFFILIATE_COMMISSION_STATES: Scenario[] = COMMISSION_FILTERS.flatMap(
  (filter) => [
    {
      id: `D-84-COM-${filter.key.toUpperCase()}`,
      name: `Admin · Affiliate · Hoa hồng ${filter.label.toLowerCase()}`,
      demo: 'affiliate',
      start: 'admin',
      fullPage: true,
      steps: (c) => filterCommissions(c, filter),
    },
    {
      id: `D-84-COM-${filter.key.toUpperCase()}-MENU`,
      name: `Admin · Affiliate · Menu khoản ${filter.label.toLowerCase()}`,
      demo: 'affiliate',
      start: 'admin',
      fullPage: true,
      steps: async (c) => {
        await filterCommissions(c, filter);
        await openCommissionMenu(c);
      },
      beforeCapture: openCommissionMenu,
    },
  ],
);
