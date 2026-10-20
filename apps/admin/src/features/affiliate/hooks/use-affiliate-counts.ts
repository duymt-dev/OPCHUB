'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { affiliateKeys, fetchAffiliates, fetchCommissions } from '../api';
import type { AffiliateStatusCounts } from '../types';

/** Global server totals, not visible row lengths or revenue divided by a presumed fee. */
export function useAffiliateCounts(allowed: boolean) {
  const agentParams = { page: 1, size: 1 };
  const agent = useQuery({
    queryKey: affiliateKeys.agents(agentParams),
    queryFn: () => fetchAffiliates(agentParams),
    enabled: allowed,
  });
  const [all, recorded, paid, cancelled] = useQueries({
    queries: (['all', 'recorded', 'paid', 'cancelled'] as const).map((status) => {
      const params = { page: 1, size: 1, status };
      return {
        queryKey: affiliateKeys.commissions(params),
        queryFn: () => fetchCommissions(params),
        enabled: allowed,
      };
    }),
  });
  const statuses: AffiliateStatusCounts = {
    all: all?.data?.total,
    recorded: recorded?.data?.total,
    paid: paid?.data?.total,
    cancelled: cancelled?.data?.total,
  };
  return {
    com: statuses.all,
    aff: agent.data?.total,
    customers:
      statuses.recorded !== undefined && statuses.paid !== undefined
        ? statuses.recorded + statuses.paid
        : undefined,
    statuses,
  };
}
