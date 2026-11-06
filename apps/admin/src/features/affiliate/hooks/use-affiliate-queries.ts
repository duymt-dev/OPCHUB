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
import { useAffiliateCounts } from './use-affiliate-counts';
import { useRegionalDirectors } from '../regional/hooks/use-regional-directors';

export function useAffiliateQueries(params: AffiliateParams) {
  const allowed = useCan('affiliate.view');
  const page = {
    page: params.page,
    size: params.size,
    q: params.q,
    ...(params.month && params.month !== 'all' ? { month: params.month } : {}),
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
    // D-94 3A (v4.2): gợi ý tab Affiliate hiện % mặc định
    enabled: allowed && (params.tab === 'cfg' || params.tab === 'aff'),
  });
  const counts = useAffiliateCounts(allowed);
  const regional = useRegionalDirectors();
  return {
    commissions,
    agents,
    summary,
    policy,
    counts: { ...counts, gdv: regional.data?.items.filter((s) => s.member).length },
  };
}
