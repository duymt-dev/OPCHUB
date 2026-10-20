'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCan } from '@/lib/permissions';
import {
  affiliateKeys,
  fetchAffiliates,
  fetchAffiliatePolicy,
  fetchAffiliateSummary,
  fetchCommissions,
} from '../api';
import type { AffiliateParams } from '../types';

export function useAffiliateQueries(params: AffiliateParams) {
  const allowed = useCan('affiliate.view');
  const page = {
    page: params.page,
    size: params.size,
    q: params.q,
    ...(params.month ? { month: params.month } : {}),
  };
  const commissionParams = { ...page, status: params.status };
  const commissions = useQuery({
    queryKey: affiliateKeys.commissions(commissionParams),
    queryFn: () => fetchCommissions(commissionParams),
    enabled: allowed && params.tab === 'com',
    placeholderData: keepPreviousData,
  });
  const agents = useQuery({
    queryKey: affiliateKeys.agents(page),
    queryFn: () => fetchAffiliates(page),
    enabled: allowed && params.tab === 'aff',
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: affiliateKeys.summary(),
    queryFn: () => fetchAffiliateSummary(),
    enabled: allowed,
  });
  const policy = useQuery({
    queryKey: affiliateKeys.policy,
    queryFn: fetchAffiliatePolicy,
    enabled: allowed && params.tab === 'cfg',
  });
  // Tab counts are unfiltered server totals, not the current page's length.
  const agentCountParams = { page: 1, size: 1 };
  const commissionCountParams = { ...agentCountParams, status: 'all' as const };
  const agentCount = useQuery({
    queryKey: affiliateKeys.agents(agentCountParams),
    queryFn: () => fetchAffiliates(agentCountParams),
    enabled: allowed,
  });
  const commissionCount = useQuery({
    queryKey: affiliateKeys.commissions(commissionCountParams),
    queryFn: () => fetchCommissions(commissionCountParams),
    enabled: allowed,
  });
  return {
    commissions,
    agents,
    summary,
    policy,
    counts: {
      com: commissionCount.data?.total,
      aff: agentCount.data?.total,
    },
  };
}
